import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { UpdateCharacterPayload, validateCharacterName } from '@/domains/character/types';

interface UpdateCharacterState {
  characterId: string;
  displayName?: string;
  bio?: string;
  avatarConfig?: Record<string, unknown>;
}

export const updateCharacterHandler = createCommandHandler<UpdateCharacterPayload>(
  async (command, ctx) => {
    if (command.type !== Commands.UPDATE_CHARACTER) return 'Invalid command type';
    
    if (command.payload.displayName) {
      const error = validateCharacterName(command.payload.displayName);
      if (error) return error;
    }

    if (!ctx.actorId) return 'Authentication required';

    // Ensure the character is their active character (or at least owned by them)
    // For MVP, we'll enforce they can only update their currently active character
    const { data: activeChar, error } = await ctx.db
      .from('acct_active_character')
      .select('character_id, acct_account!inner(user_id)')
      .eq('acct_account.user_id', ctx.actorId)
      .maybeSingle();

    if (error || !activeChar) {
      return 'No active character selected';
    }

    // Pass the active char ID into the simulate state somehow, or rely on it
    (command.payload as Record<string, unknown>)._activeCharacterId = activeChar.character_id;

    return true;
  },
  async (command) => {
    const characterId = (command.payload as Record<string, unknown>)._activeCharacterId as string;
    return {
      characterId,
      displayName: command.payload.displayName,
      bio: command.payload.bio,
      avatarConfig: command.payload.avatarConfig
    } as UpdateCharacterState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as UpdateCharacterState;
    const updates: Record<string, unknown> = {};
    if (state.displayName !== undefined) updates.display_name = state.displayName;
    if (state.bio !== undefined) updates.bio = state.bio;
    if (state.avatarConfig !== undefined) updates.avatar_config = state.avatarConfig;

    if (Object.keys(updates).length > 0) {
      const { error } = await ctx.db
        .from('chr_character')
        .update(updates)
        .eq('id', state.characterId);
        
      if (error) throw new Error(`Failed to update character: ${error.message}`);
    }
  }
);
