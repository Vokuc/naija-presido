import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { SelectCharacterPayload } from '@/domains/character/types';

interface SelectCharacterState {
  accountId: string;
  characterId: string;
}

export const selectCharacterHandler = createCommandHandler<SelectCharacterPayload>(
  async (command, ctx) => {
    if (command.type !== Commands.SELECT_CHARACTER) return 'Invalid command type';
    const { characterId } = command.payload;
    if (!characterId) return 'Character ID is required';
    if (!ctx.actorId) return 'Authentication required';

    // Verify the character belongs to the user
    const { data, error } = await ctx.db
      .from('chr_character')
      .select('id, account_id, acct_account!inner(user_id)')
      .eq('id', characterId)
      .single();

    if (error || !data) return 'Character not found';
    
    // eslint-disable-next-999 (avoiding deep property access TS errors if any)
    const userId = (data.acct_account as unknown as Record<string, unknown>)?.user_id || data.acct_account?.user_id;

    if (userId !== ctx.actorId) {
      return 'You do not own this character';
    }

    return true;
  },
  async (command, ctx) => {
    // Get account ID
    const { data } = await ctx.db
      .from('acct_account')
      .select('id')
      .eq('user_id', ctx.actorId)
      .single();

    if (!data) throw new Error('Account not found');

    return {
      accountId: data.id,
      characterId: command.payload.characterId
    } as SelectCharacterState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as SelectCharacterState;
    
    // Upsert active character
    const { error } = await ctx.db
      .from('acct_active_character')
      .upsert({
        account_id: state.accountId,
        character_id: state.characterId,
        switched_at: new Date().toISOString()
      }, { onConflict: 'account_id' });

    if (error) throw new Error(`Failed to select character: ${error.message}`);
  }
);
