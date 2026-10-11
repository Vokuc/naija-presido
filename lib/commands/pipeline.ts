import {
  Command,
  CommandType,
  AUTHORITATIVE_PROTECTED_FIELDS,
  IDEMPOTENT_MANDATORY_COMMANDS,
  PipelineCommandResult,
} from '@/lib/types/command-types';
import {
  CommandDefinition,
  CommandExecutionContext,
  SimulationOutcome,
} from './types';
import { EventService, deriveRetentionTier } from '@/domains/events';

/**
 * Recursively inspects an object for forbidden authoritative keys.
 */
function findDisallowedField(
  obj: unknown,
  disallowed: readonly string[]
): string | null {
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
 * Authoritative Command Pipeline Execution Engine.
 * Enforces:
 * Auth -> Authorization -> Validation -> Simulation -> Events -> State Changes -> Realtime -> Observability -> Response
 */
export async function executeCommandPipeline<TPayload = any, TOutcome = any>(
  command: Command<TPayload>,
  definition: CommandDefinition<TPayload, TOutcome>,
  ctx: CommandExecutionContext
): Promise<PipelineCommandResult<TOutcome>> {
  const startTime = performance.now();

  try {
    // 0. Well-formedness check
    if (!command || !command.type) {
      return recordRejection(
        ctx,
        command?.type || 'UNKNOWN',
        'Invalid command format: missing command type',
        400,
        startTime,
        command
      );
    }

    // 1. Authoritative outcome protection guard:
    // Clients can never provide direct outcomes (e.g. balance, reputation, ownership, npc_outcome)
    const protectedFields = [
      ...AUTHORITATIVE_PROTECTED_FIELDS,
      ...(definition.customDisallowedFields || [])
    ];
    const forbiddenField = findDisallowedField(command.payload, protectedFields);
    if (forbiddenField) {
      return recordRejection(
        ctx,
        command.type,
        `Direct state mutation rejected: client cannot specify authoritative outcome '${forbiddenField}'`,
        400,
        startTime,
        command
      );
    }

    // 2. Idempotency Requirement Guard
    const isIdempotencyMandatory =
      definition.requiresIdempotency ?? IDEMPOTENT_MANDATORY_COMMANDS.has(command.type);

    if (isIdempotencyMandatory && !command.idempotency_key) {
      return recordRejection(
        ctx,
        command.type,
        `Idempotency key is required for state-changing command ${command.type}`,
        400,
        startTime,
        command
      );
    }

    // 3. Authentication Step
    const requiresAuth = definition.requiresAuth !== false && !ctx.skipAuth;
    if (requiresAuth && !ctx.actorId) {
      return recordRejection(
        ctx,
        command.type,
        'Authentication required to execute this command',
        401,
        startTime,
        command
      );
    }

    // 4. Active Character Resolution & Identity Verification
    const requiresActiveChar = definition.requiresActiveCharacter !== false && !ctx.skipAuth;
    if (requiresActiveChar && ctx.actorId) {
      const { data: activeChar, error: activeErr } = await ctx.db
        .from('acct_active_character')
        .select('character_id, acct_account!inner(user_id, status)')
        .eq('acct_account.user_id', ctx.actorId)
        .maybeSingle();

      if (activeErr || !activeChar) {
        return recordRejection(
          ctx,
          command.type,
          'No active character selected for current account',
          403,
          startTime,
          command
        );
      }

      const accountData = Array.isArray(activeChar.acct_account)
        ? activeChar.acct_account[0]
        : activeChar.acct_account;

      if (accountData?.status && accountData.status !== 'active') {
        return recordRejection(
          ctx,
          command.type,
          `Account is ${accountData.status}`,
          403,
          startTime,
          command
        );
      }

      // If client supplied a character_id, ensure it strictly matches active character
      if (command.character_id && command.character_id !== activeChar.character_id) {
        return recordRejection(
          ctx,
          command.type,
          'Unauthorized: character does not match active character',
          403,
          startTime,
          command
        );
      }

      ctx.characterId = activeChar.character_id;
    } else if (command.character_id && !ctx.characterId) {
      ctx.characterId = command.character_id;
    }

    // 5. Idempotency Replay Check (Checks if already executed)
    if (command.idempotency_key) {
      try {
        const { data: existingRecord } = await ctx.db
          .from('cmd_idempotency')
          .select('response_payload')
          .eq('idempotency_key', command.idempotency_key)
          .maybeSingle();

        if (existingRecord?.response_payload) {
          // Idempotent replay: return cached result without re-executing
          await recordObservability(ctx, command, 'accepted', startTime, existingRecord.response_payload);
          return {
            ok: true,
            state: existingRecord.response_payload as TOutcome,
            idempotent_replay: true,
          };
        }
      } catch {
        // If table does not yet exist or transient error, proceed with execution
      }
    }

    // 5. Authorization Step
    if (definition.authorize) {
      const authResult = await definition.authorize(command, ctx);
      const isAuthorized = typeof authResult === 'boolean' ? authResult : typeof authResult === 'object' ? authResult.ok : false;
      const reason = typeof authResult === 'string' ? authResult : typeof authResult === 'object' ? authResult.reason : 'Unauthorized action';
      const status = typeof authResult === 'object' && authResult.status ? authResult.status : 403;

      if (!isAuthorized) {
        return recordRejection(ctx, command.type, reason || 'Unauthorized action', status, startTime, command);
      }
    }

    // 6. Validation Step
    const valResult = await definition.validate(command, ctx);
    const isValid = typeof valResult === 'boolean' ? valResult : typeof valResult === 'object' ? valResult.ok : false;
    const valReason = typeof valResult === 'string' ? valResult : typeof valResult === 'object' ? valResult.reason : 'Validation failed';
    const valStatus = typeof valResult === 'object' && valResult.status ? valResult.status : 400;

    if (!isValid) {
      return recordRejection(ctx, command.type, valReason || 'Validation failed', valStatus, startTime, command);
    }

    // 7. Simulation Step (Computes outcome, events, notifications, state changes)
    const outcome = await definition.simulate(command, ctx);

    // 8. Persistence (State Changes & Domain Events)
    if (definition.persist) {
      await definition.persist(outcome, command, ctx);
    } else {
      await defaultPersist(outcome, command, ctx);
    }

    // 9. Realtime Notifications
    if (definition.notify) {
      await definition.notify(outcome, command, ctx);
    } else {
      await defaultNotify(outcome, ctx);
    }

    // 10. Observability Log
    await recordObservability(ctx, command, 'accepted', startTime, outcome.state);

    return {
      ok: true,
      state: outcome.state,
      events: outcome.events,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal simulation error';
    await recordObservability(ctx, command, 'error', startTime, null, errMessage);
    return {
      ok: false,
      reason: errMessage,
      status: 500,
    };
  }
}

/**
 * Standard persistence for events, effects, notifications, state mutations, and idempotency cache.
 */
async function defaultPersist<TPayload, TOutcome>(
  outcome: SimulationOutcome<TOutcome>,
  command: Command<TPayload>,
  ctx: CommandExecutionContext
): Promise<void> {
  // Execute state mutations
  if (outcome.stateMutations) {
    await outcome.stateMutations(ctx);
  }

  // Persist domain events & effects
  if (outcome.events && outcome.events.length > 0) {
    const authoritativeGameTime = ctx.gameTime
      ? ctx.gameTime.toISOString()
      : await EventService.resolveGameTime(ctx.db);

    for (const evt of outcome.events) {
      const retentionTier = evt.retention_tier ?? deriveRetentionTier(evt.significance);
      const actorType = evt.actor_type ?? (evt.actor_id || ctx.characterId ? 'character' : 'system');
      const gameTimestamp = evt.game_timestamp ?? authoritativeGameTime;

      // Hydrate input event with authoritative derived values
      evt.game_timestamp = gameTimestamp;
      evt.retention_tier = retentionTier;
      evt.actor_type = actorType;

      const eventInsert = {
        type: evt.type,
        category: evt.category,
        significance: evt.significance,
        retention_tier: retentionTier,
        actor_id: evt.actor_id ?? ctx.characterId ?? null,
        actor_type: actorType,
        location_id: evt.location_id ?? null,
        venue_id: evt.venue_id ?? null,
        payload: evt.payload ?? {},
        caused_by: evt.caused_by ?? null,
        game_timestamp: gameTimestamp,
      };

      const insertQuery = ctx.db.from('evt_event').insert(eventInsert);
      let eventId: string | null = null;

      if (typeof insertQuery?.select === 'function') {
        const { data: insertedEvent } = await insertQuery.select('id').maybeSingle();
        eventId = insertedEvent?.id ?? null;
      } else {
        const res = (await insertQuery) as any;
        eventId = res?.data?.id ?? 'evt-1';
      }

      if (eventId && evt.effects && evt.effects.length > 0) {
        const effectsToInsert = evt.effects.map(eff => ({
          event_id: eventId,
          target_type: eff.target_type,
          target_id: eff.target_id,
          attribute: eff.attribute,
          delta: eff.delta,
        }));
        await ctx.db.from('evt_effect').insert(effectsToInsert);
      }
    }
  }

  // Persist notifications
  if (outcome.notifications && outcome.notifications.length > 0) {
    const notifs = outcome.notifications.map(n => ({
      character_id: n.character_id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      payload: n.payload ?? {},
    }));
    await ctx.db.from('ntf_notification').insert(notifs);
  }

  // Cache idempotency record
  if (command.idempotency_key) {
    try {
      await ctx.db.from('cmd_idempotency').insert({
        idempotency_key: command.idempotency_key,
        command_type: command.type,
        character_id: ctx.characterId ?? null,
        user_id: ctx.actorId ?? null,
        response_payload: outcome.state ?? {},
      });
    } catch {
      // Idempotency insert failure should not fail an otherwise successful command
    }
  }
}

/**
 * Standard realtime broadcast dispatcher.
 */
async function defaultNotify<TOutcome>(
  outcome: SimulationOutcome<TOutcome>,
  ctx: CommandExecutionContext
): Promise<void> {
  if (!outcome.realtimeBroadcasts || outcome.realtimeBroadcasts.length === 0) return;

  for (const b of outcome.realtimeBroadcasts) {
    try {
      if (typeof ctx.db.channel === 'function') {
        const channel = ctx.db.channel(b.channel);
        await channel.send({
          type: 'broadcast',
          event: b.event,
          payload: b.payload,
        });
      }
    } catch {
      // Broadcast failures must not break committed game actions
    }
  }
}

/**
 * Record command rejection in observability log.
 */
async function recordRejection<TOutcome>(
  ctx: CommandExecutionContext,
  commandType: CommandType | string,
  reason: string,
  status: number,
  startTime: number,
  command?: Command<any>
): Promise<PipelineCommandResult<TOutcome>> {
  await recordObservability(ctx, command, 'rejected', startTime, null, reason);
  return {
    ok: false,
    reason,
    status,
  };
}

/**
 * Writes an entry into obs_command_log for auditable history.
 */
async function recordObservability(
  ctx: CommandExecutionContext,
  command?: Command<any>,
  status: 'accepted' | 'rejected' | 'error' = 'accepted',
  startTime: number = performance.now(),
  resultPayload?: unknown,
  rejectionReason?: string
): Promise<void> {
  try {
    const duration = Math.round(performance.now() - startTime);
    await ctx.db.from('obs_command_log').insert({
      command_type: command?.type || 'UNKNOWN',
      actor_id: ctx.characterId ?? null,
      character_id: ctx.characterId ?? null,
      status,
      rejection_reason: rejectionReason ?? null,
      idempotency_key: command?.idempotency_key ?? null,
      duration_ms: duration,
      payload: command?.payload ?? {},
      result_payload: resultPayload ?? null,
    });
  } catch {
    // Audit logging should never bubble up to break the user flow
  }
}
