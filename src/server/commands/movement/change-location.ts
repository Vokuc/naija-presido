import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { ChangeLocationPayload } from '@/domains/geography/types';

interface ChangeLocationState {
  characterId: string;
  targetLocationId: string;
}

export const changeLocationHandler = createCommandHandler<ChangeLocationPayload>(
  async (command, ctx) => {
    if (command.type !== Commands.MOVE_CHARACTER) return 'Invalid command type';
    const { targetLocationId } = command.payload;
    if (!targetLocationId) return 'Target location ID is required';
    if (!ctx.actorId) return 'Authentication required';

    // Verify active character
    const { data: activeChar, error: activeErr } = await ctx.db
      .from('acct_active_character')
      .select('character_id, acct_account!inner(user_id)')
      .eq('acct_account.user_id', ctx.actorId)
      .maybeSingle();

    if (activeErr || !activeChar) return 'No active character selected';

    // Verify target location exists
    const { data: loc, error: locErr } = await ctx.db
      .from('geo_location')
      .select('id')
      .eq('id', targetLocationId)
      .maybeSingle();

    if (locErr || !loc) return 'Target location does not exist';

    (command.payload as Record<string, unknown>)._activeCharacterId = activeChar.character_id;
    return true;
  },
  async (command) => {
    return {
      characterId: (command.payload as Record<string, unknown>)._activeCharacterId as string,
      targetLocationId: command.payload.targetLocationId
    } as ChangeLocationState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as ChangeLocationState;

    // Moving location implies leaving the current venue
    const { error } = await ctx.db
      .from('chr_character_state')
      .upsert({
        character_id: state.characterId,
        location_id: state.targetLocationId,
        venue_id: null, // Clear venue when moving general location
        updated_at: new Date().toISOString()
      }, { onConflict: 'character_id' });

    if (error) throw new Error(`Failed to change location: ${error.message}`);
  }
);
