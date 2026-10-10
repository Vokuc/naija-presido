import { createCommandHandler } from '@/lib/command-handler';
import { Commands } from '@/lib/types/command-types';
import { CreateAccountPayload, validateUsername } from '@/domains/account/types';

// We map payload type in simulate state
interface CreateAccountState {
  accountId: string;
  username: string;
}

export const createAccountHandler = createCommandHandler<CreateAccountPayload>(
  async (command, ctx) => {
    if (command.type !== Commands.CREATE_ACCOUNT) return 'Invalid command type';
    const { username } = command.payload;
    const error = validateUsername(username);
    if (error) return error;

    if (!ctx.actorId) {
      return 'Authentication required';
    }

    // Check if account already exists for this user_id
    const { data: existingAccount } = await ctx.db
      .from('acct_account')
      .select('id')
      .eq('user_id', ctx.actorId)
      .maybeSingle();

    if (existingAccount) {
      return 'Account already exists for this user';
    }

    // Check if username is taken
    const { data: existingUser } = await ctx.db
      .from('acct_account')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return 'Username already taken';
    }

    return true;
  },
  async (command) => {
    // Simulate simply generates the intended state to persist
    return {
      username: command.payload.username
    } as CreateAccountState;
  },
  async (simulatedState, ctx) => {
    const state = simulatedState as CreateAccountState;
    // Perform actual write using service role / auth context
    const { error } = await ctx.db
      .from('acct_account')
      .insert({
        user_id: ctx.actorId,
        username: state.username,
        status: 'active'
      });

    if (error) throw new Error(`Database error: ${error.message}`);
  }
);
