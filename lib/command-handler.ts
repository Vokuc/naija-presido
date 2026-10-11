import { SupabaseClient } from '@supabase/supabase-js';
import {
  Command,
  AUTHORITATIVE_PROTECTED_FIELDS,
  PipelineCommandResult,
} from './types/command-types';
import { CommandExecutionContext } from './commands/types';

export interface CommandContext extends CommandExecutionContext {
  characterId?: string;
  actorId?: string;
  db: SupabaseClient;
  gameTime?: Date;
  skipAuth?: boolean;
}

export type CommandResult<T = unknown> = PipelineCommandResult<T>;

export type CommandPipeline<T> = (
  command: Command<T>,
  ctx: CommandContext
) => Promise<CommandResult>;

/**
 * Checks for protected authoritative fields in payload.
 */
function findDisallowedField(obj: unknown, disallowed: readonly string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    if (disallowed.includes(key.toLowerCase())) {
      return key;
    }
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === 'object' && val !== null) {
      const nested = findDisallowedField(val, disallowed);
      if (nested) return nested;
    }
  }
  return null;
}

/**
 * Domain command handler wrapper.
 * Enforces authoritative mutation guards, validation, simulation, and persistence.
 */
export function createCommandHandler<T>(
  validate: (command: Command<T>, ctx: CommandContext) => Promise<boolean | string>,
  simulate: (command: Command<T>, ctx: CommandContext) => Promise<unknown>,
  write: (simulatedState: any, events: any, ctx: any) => Promise<void>
): CommandPipeline<T> {
  return async (command, ctx) => {
    try {
      // Direct state mutation guard: reject direct outcome mutations
      const forbidden = findDisallowedField(command.payload, AUTHORITATIVE_PROTECTED_FIELDS);
      if (forbidden) {
        return {
          ok: false,
          reason: `Direct state mutation rejected: client cannot specify authoritative outcome '${forbidden}'`,
          status: 400,
        };
      }

      // Validation Step
      const validationResult = await validate(command, ctx);
      if (validationResult !== true) {
        return {
          ok: false,
          reason: typeof validationResult === 'string' ? validationResult : 'Validation failed',
          status: 400,
        };
      }

      // Simulation Step (Authoritative outcome calculation)
      const simulatedState = await simulate(command, ctx);

      // State Changes / Persistence
      await (write as any)(simulatedState, [], ctx);

      return { ok: true, state: simulatedState };
    } catch (error: unknown) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'Internal error',
        status: 500,
      };
    }
  };
}
