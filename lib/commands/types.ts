import { SupabaseClient } from '@supabase/supabase-js';
import {
  Command,
  CommandType,
  DomainEventInput,
  NotificationInput,
  RealtimeBroadcastInput,
  PipelineCommandResult,
} from '@/lib/types/command-types';

export interface CommandExecutionContext {
  db: SupabaseClient;
  actorId?: string;          // Authenticated auth.users ID
  characterId?: string;      // Active character ID
  gameTime?: Date;           // Calculated game time from clock
  skipAuth?: boolean;        // Only for server-internal testing
}

export interface SimulationOutcome<TState = unknown> {
  state: TState;
  events?: DomainEventInput[];
  notifications?: NotificationInput[];
  realtimeBroadcasts?: RealtimeBroadcastInput[];
  stateMutations?: (ctx: CommandExecutionContext) => Promise<void>;
}

export type AuthCheckResult = boolean | string | { ok: boolean; reason?: string; status?: number };
export type ValidationResult = boolean | string | { ok: boolean; reason?: string; status?: number };

export interface CommandDefinition<TPayload = any, TOutcome = any> {
  type: CommandType;
  requiresAuth?: boolean;             // Defaults to true
  requiresActiveCharacter?: boolean; // Defaults to true
  requiresIdempotency?: boolean;     // Defaults to IDEMPOTENT_MANDATORY_COMMANDS check
  customDisallowedFields?: string[]; // Extra protected fields to block

  // Step 2: Authorization
  authorize?: (
    cmd: Command<TPayload>,
    ctx: CommandExecutionContext
  ) => Promise<AuthCheckResult>;

  // Step 3: Validation
  validate: (
    cmd: Command<TPayload>,
    ctx: CommandExecutionContext
  ) => Promise<ValidationResult>;

  // Step 4: Simulation
  simulate: (
    cmd: Command<TPayload>,
    ctx: CommandExecutionContext
  ) => Promise<SimulationOutcome<TOutcome>>;

  // Step 5 & 6: Persistence override (optional)
  persist?: (
    outcome: SimulationOutcome<TOutcome>,
    cmd: Command<TPayload>,
    ctx: CommandExecutionContext
  ) => Promise<void>;

  // Step 7: Realtime notification override (optional)
  notify?: (
    outcome: SimulationOutcome<TOutcome>,
    cmd: Command<TPayload>,
    ctx: CommandExecutionContext
  ) => Promise<void>;
}

export type CommandHandlerFunction<T = unknown> = (
  command: Command<T>,
  ctx: CommandExecutionContext
) => Promise<PipelineCommandResult>;
