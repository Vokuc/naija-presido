import { Commands } from '@/lib/types/command-types';
import { defineCommand, registerCommand } from '../registry';
import {
  CreateAccountPayload,
  validateUsername,
} from '@/domains/account/types';
import {
  CreateCharacterPayload,
  validateCharacterName,
  SelectCharacterPayload,
  UpdateCharacterPayload,
} from '@/domains/character/types';

export const CreateAccountCommand = registerCommand<CreateAccountPayload, { username: string }>(
  defineCommand({
    type: Commands.CREATE_ACCOUNT,
    requiresAuth: true,
    requiresActiveCharacter: false, // Account is created before character
    validate: async (cmd, ctx) => {
      const { username } = cmd.payload;
      const error = validateUsername(username);
      if (error) return error;

      if (!ctx.actorId) return 'Authentication required';

      const { data: existingAccount } = await ctx.db
        .from('acct_account')
        .select('id')
        .eq('user_id', ctx.actorId)
        .maybeSingle();

      if (existingAccount) return 'Account already exists for this user';

      const { data: existingUser } = await ctx.db
        .from('acct_account')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) return 'Username already taken';

      return true;
    },
    simulate: async (cmd) => {
      return {
        state: { username: cmd.payload.username },
        stateMutations: async (c) => {
          const { error } = await c.db.from('acct_account').insert({
            user_id: c.actorId,
            username: cmd.payload.username,
            status: 'active',
          });
          if (error) throw new Error(`Failed to create account: ${error.message}`);
        },
      };
    },
  })
);

export const CreateCharacterCommand = registerCommand<CreateCharacterPayload, { displayName: string }>(
  defineCommand({
    type: Commands.CREATE_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: false,
    validate: async (cmd, ctx) => {
      if (!cmd.payload.isNpc && !ctx.actorId) return 'Authentication required';

      const nameErr = validateCharacterName(cmd.payload.displayName);
      if (nameErr) return nameErr;

      if (!cmd.payload.isNpc && ctx.actorId) {
        const { data: account, error: acctErr } = await ctx.db
          .from('acct_account')
          .select('id')
          .eq('user_id', ctx.actorId)
          .maybeSingle();

        if (acctErr || !account) return 'Game account does not exist. Create an account first.';
        (cmd.payload as unknown as Record<string, unknown>)._accountId = account.id;
      }

      return true;
    },
    simulate: async (cmd) => {
      const accountId = (cmd.payload as unknown as Record<string, unknown>)._accountId as string | null ?? null;
      const displayName = cmd.payload.displayName;

      return {
        state: { displayName },
        events: [
          {
            type: 'CHARACTER_CREATED',
            category: 'action',
            significance: 'minor',
            payload: { displayName, isNpc: !!cmd.payload.isNpc },
          },
        ],
        stateMutations: async (c) => {
          const { data: character, error: charErr } = await c.db
            .from('chr_character')
            .insert({
              account_id: accountId,
              is_npc: !!cmd.payload.isNpc,
              display_name: displayName,
              avatar_config: cmd.payload.avatarConfig || {},
              bio: cmd.payload.bio || null,
            })
            .select('id')
            .single();

          if (charErr || !character) throw new Error(`Failed to create character: ${charErr?.message}`);

          if (accountId) {
            // Set default active character
            await c.db.from('acct_active_character').upsert({
              account_id: accountId,
              character_id: character.id,
            });
          }

          // Initialize character state
          await c.db.from('chr_character_state').insert({
            character_id: character.id,
          });
        },
      };
    },
  })
);

export const SelectCharacterCommand = registerCommand<SelectCharacterPayload, { characterId: string }>(
  defineCommand({
    type: Commands.SELECT_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: false,
    validate: async (cmd, ctx) => {
      if (!ctx.actorId) return 'Authentication required';
      const { characterId } = cmd.payload;
      if (!characterId) return 'Character ID is required';

      const { data: account, error: acctErr } = await ctx.db
        .from('acct_account')
        .select('id')
        .eq('user_id', ctx.actorId)
        .maybeSingle();

      if (acctErr || !account) return 'Account not found';

      const { data: character, error: charErr } = await ctx.db
        .from('chr_character')
        .select('id')
        .eq('id', characterId)
        .eq('account_id', account.id)
        .maybeSingle();

      if (charErr || !character) return 'Character does not belong to this account';

      (cmd.payload as unknown as Record<string, unknown>)._accountId = account.id;
      return true;
    },
    simulate: async (cmd) => {
      const accountId = (cmd.payload as unknown as Record<string, unknown>)._accountId as string;
      return {
        state: { characterId: cmd.payload.characterId },
        stateMutations: async (c) => {
          const { error } = await c.db
            .from('acct_active_character')
            .upsert({
              account_id: accountId,
              character_id: cmd.payload.characterId,
              last_switched_at: new Date().toISOString(),
            }, { onConflict: 'account_id' });

          if (error) throw new Error(`Failed to select character: ${error.message}`);
        },
      };
    },
  })
);

export interface UpdateCharacterOutcome {
  displayName?: string;
  bio?: string;
}

export const UpdateCharacterCommand = registerCommand<UpdateCharacterPayload, UpdateCharacterOutcome>(
  defineCommand({
    type: Commands.UPDATE_CHARACTER,
    requiresAuth: true,
    requiresActiveCharacter: true,
    validate: async (cmd) => {
      if (cmd.payload.displayName) {
        const nameErr = validateCharacterName(cmd.payload.displayName);
        if (nameErr) return nameErr;
      }
      return true;
    },
    simulate: async (cmd, ctx) => {
      const charId = ctx.characterId!;
      const state: UpdateCharacterOutcome = {};
      if (cmd.payload.displayName !== undefined) state.displayName = cmd.payload.displayName;
      if (cmd.payload.bio !== undefined) state.bio = cmd.payload.bio;

      return {
        state,
        stateMutations: async (c) => {
          const updates: Record<string, unknown> = {};
          if (cmd.payload.displayName !== undefined) updates.display_name = cmd.payload.displayName;
          if (cmd.payload.bio !== undefined) updates.bio = cmd.payload.bio;
          if (cmd.payload.avatarConfig !== undefined) updates.avatar_config = cmd.payload.avatarConfig;

          const { error } = await c.db
            .from('chr_character')
            .update(updates)
            .eq('id', charId);

          if (error) throw new Error(`Failed to update character: ${error.message}`);
        },
      };
    },
  })
);
