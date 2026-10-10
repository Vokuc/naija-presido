import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { CreateCharacterPayload, validateCharacterName } from '@/domains/character/types';

interface CreateCharacterState {
  accountId: string | null;
  displayName: string;
  bio: string | null;
  avatarConfig: Record<string, unknown>;
  isNpc: boolean;
}

export const createCharacterHandler = createCommandHandler<CreateCharacterPayload>(
  async (command, ctx) => {
    if (command.type !== Commands.CREATE_CHARACTER) return 'Invalid command type';
    const { displayName, isNpc } = command.payload;
    const error = validateCharacterName(displayName);
    if (error) return error;

    // Only authenticated users can create player characters
    // NPCs could potentially be created by system actors, but we'll enforce authentication for MVP
    if (!isNpc && !ctx.actorId) {
      return 'Authentication required to create a player character';
    }

    return true;
  },
  async (command, ctx) => {
    // If not NPC, find the user's account_id
    let accountId = null;
    if (!command.payload.isNpc && ctx.actorId) {
      const { data } = await ctx.db
        .from('acct_account')
        .select('id')
        .eq('user_id', ctx.actorId)
        .single();
      
      if (!data) throw new Error('Account not found for user');
      accountId = data.id;
    }

    return {
      accountId,
      displayName: command.payload.displayName,
      bio: command.payload.bio || null,
      avatarConfig: command.payload.avatarConfig || {},
      isNpc: !!command.payload.isNpc
    } as CreateCharacterState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as CreateCharacterState;
    
    // Create the character
    const { data: char, error } = await ctx.db
      .from('chr_character')
      .insert({
        account_id: state.accountId,
        is_npc: state.isNpc,
        display_name: state.displayName,
        avatar_config: state.avatarConfig,
        bio: state.bio
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create character: ${error.message}`);

    // If it's a player character, we optionally make it active if they don't have one
    // But architecture requires explicit selection.
    
    // Also initialize stats and wallet
    await ctx.db.from('chr_character_stats').insert({ character_id: char.id });
    await ctx.db.from('eco_wallet').insert({ character_id: char.id });
  }
);
