import { Command, CommandType, PipelineCommandResult } from '@/lib/types/command-types';
import { CommandDefinition, CommandExecutionContext } from './types';
import { executeCommandPipeline } from './pipeline';

const registry = new Map<CommandType, CommandDefinition<any, any>>();

/**
 * Register an authoritative command definition.
 */
export function registerCommand<TPayload = any, TOutcome = any>(
  definition: CommandDefinition<TPayload, TOutcome>
): CommandDefinition<TPayload, TOutcome> {
  registry.set(definition.type, definition);
  return definition;
}

/**
 * Retrieve a registered command definition.
 */
export function getCommandDefinition(
  type: CommandType
): CommandDefinition<any, any> | undefined {
  return registry.get(type);
}

/**
 * Helper to define a strongly-typed command definition.
 */
export function defineCommand<TPayload = any, TOutcome = any>(
  definition: CommandDefinition<TPayload, TOutcome>
): CommandDefinition<TPayload, TOutcome> {
  return definition;
}

/**
 * Execute a command through the authoritative pipeline.
 */
export async function executeCommand<TPayload = any, TOutcome = any>(
  command: Command<TPayload>,
  ctx: CommandExecutionContext
): Promise<PipelineCommandResult<TOutcome>> {
  const definition = getCommandDefinition(command.type);
  if (!definition) {
    return {
      ok: false,
      reason: `Unknown command type: ${command.type}`,
      status: 400,
    };
  }

  return executeCommandPipeline(command, definition, ctx);
}
