import { Command } from './types/command-types';

import { SupabaseClient } from '@supabase/supabase-js';

export interface CommandContext {
  characterId?: string;
  actorId?: string;
  db: SupabaseClient;
}

export interface CommandResult<T = unknown> {
  ok: boolean;
  state?: T;
  reason?: string;
}

export type CommandPipeline<T> = (command: Command<T>, ctx: CommandContext) => Promise<CommandResult>;

export function createCommandHandler<T>(
  validate: (command: Command<T>, ctx: CommandContext) => Promise<boolean | string>,
  simulate: (command: Command<T>, ctx: CommandContext) => Promise<unknown>,
  write: (simulatedState: unknown, ctx: CommandContext) => Promise<void>
): CommandPipeline<T> {
  return async (command, ctx) => {
    try {
      const validationResult = await validate(command, ctx);
      if (validationResult !== true) {
        return { ok: false, reason: typeof validationResult === 'string' ? validationResult : 'Validation failed' };
      }
      
      const simulatedState = await simulate(command, ctx);
      await write(simulatedState, ctx);
      
      return { ok: true, state: simulatedState };
    } catch (error: unknown) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Internal error' };
    }
  };
}
