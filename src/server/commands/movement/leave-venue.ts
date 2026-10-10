import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { LeaveVenuePayload } from '@/domains/physical-world/types';

interface LeaveVenueState {
  characterId: string;
}

export const leaveVenueHandler = createCommandHandler<LeaveVenuePayload>(
  async (command, ctx) => {
    if (command.type !== Commands.LEAVE_VENUE) return 'Invalid command type';
    if (!ctx.actorId) return 'Authentication required';

    // Verify active character
    const { data: activeChar, error: activeErr } = await ctx.db
      .from('acct_active_character')
      .select('character_id, acct_account!inner(user_id)')
      .eq('acct_account.user_id', ctx.actorId)
      .maybeSingle();

    if (activeErr || !activeChar) return 'No active character selected';
    
    const { data: charState } = await ctx.db
      .from('chr_character_state')
      .select('venue_id')
      .eq('character_id', activeChar.character_id)
      .maybeSingle();

    if (!charState || !charState.venue_id) return 'Not currently in a venue';

    (command.payload as Record<string, unknown>)._activeCharacterId = activeChar.character_id;
    return true;
  },
  async (command) => {
    return {
      characterId: (command.payload as Record<string, unknown>)._activeCharacterId as string
    } as LeaveVenueState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as LeaveVenueState;

    const { error } = await ctx.db
      .from('chr_character_state')
      .update({
        venue_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('character_id', state.characterId);

    if (error) throw new Error(`Failed to leave venue: ${error.message}`);
  }
);
