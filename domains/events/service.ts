import { WorldTimeService } from '../world-time/service';
import {
  CreateDomainEventInput,
  DomainEventRecord,
  DomainEffect,
  EventTargetType,
  CharacterTimelineOptions,
  LocationTimelineOptions,
  WorldChronicleOptions,
  CausalTraceResult,
  deriveRetentionTier,
  SIGNIFICANCE_LEVELS,
} from './types';

export class EventService {
  /**
   * Derives authoritative game time from the database world clock or fallback.
   */
  public static async resolveGameTime(
    db: any,
    worldTimeService?: WorldTimeService
  ): Promise<string> {
    if (worldTimeService) {
      return worldTimeService.getCurrentGameTime().toISOString();
    }

    try {
      if (db?.from) {
        const { data: clockRow } = await db
          .from('wrld_clock')
          .select('epoch_real, epoch_game, scale_factor, paused, paused_at')
          .maybeSingle();

        if (clockRow) {
          const service = new WorldTimeService({
            id: 'authoritative_clock',
            epochReal: new Date(clockRow.epoch_real),
            epochGame: new Date(clockRow.epoch_game),
            scaleFactor: Number(clockRow.scale_factor),
            paused: Boolean(clockRow.paused),
            pausedAt: clockRow.paused_at ? new Date(clockRow.paused_at) : null,
          });
          return service.getCurrentGameTime().toISOString();
        }
      }
    } catch {
      // Fall through to real time if clock is uninitialized
    }

    return new Date().toISOString();
  }

  /**
   * Persists a durable domain event with its associated effects.
   */
  public static async recordEvent(
    input: CreateDomainEventInput,
    ctx: { db: any; worldTimeService?: WorldTimeService }
  ): Promise<DomainEventRecord> {
    const gameTimestamp =
      input.gameTimestamp ?? (await this.resolveGameTime(ctx.db, ctx.worldTimeService));
    const retentionTier = input.retentionTier ?? deriveRetentionTier(input.significance);
    const actorType = input.actorType ?? (input.actorId ? 'character' : 'system');

    const eventInsert = {
      type: input.type,
      category: input.category,
      significance: input.significance,
      retention_tier: retentionTier,
      actor_id: input.actorId ?? null,
      actor_type: actorType,
      location_id: input.locationId ?? null,
      venue_id: input.venueId ?? null,
      payload: input.payload ?? {},
      caused_by: input.causedBy ?? null,
      game_timestamp: gameTimestamp,
    };

    let eventId: string;
    let createdAt: string = new Date().toISOString();

    const insertQuery = ctx.db.from('evt_event').insert(eventInsert);

    if (typeof insertQuery?.select === 'function') {
      const { data: created, error } = await insertQuery
        .select('id, created_at')
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to record domain event [${input.type}]: ${error.message}`);
      }
      eventId = created?.id ?? 'evt-' + Math.random().toString(36).substring(2, 9);
      if (created?.created_at) createdAt = created.created_at;
    } else {
      const res = (await insertQuery) as any;
      eventId = res?.data?.id ?? 'evt-' + Math.random().toString(36).substring(2, 9);
      if (res?.data?.created_at) createdAt = res.data.created_at;
    }

    // Persist associated effects if any
    const persistedEffects: DomainEffect[] = [];
    if (input.effects && input.effects.length > 0) {
      const effectsToInsert = input.effects.map((eff) => ({
        event_id: eventId,
        target_type: eff.targetType,
        target_id: eff.targetId,
        attribute: eff.attribute,
        delta: eff.delta,
      }));

      const effectsQuery = ctx.db.from('evt_effect').insert(effectsToInsert);
      if (typeof effectsQuery?.select === 'function') {
        const { data: createdEffects } = await effectsQuery
          .select('id, target_type, target_id, attribute, delta, applied_at');
        if (Array.isArray(createdEffects)) {
          for (const eff of createdEffects) {
            persistedEffects.push({
              id: eff.id,
              eventId,
              targetType: eff.target_type as EventTargetType,
              targetId: eff.target_id,
              attribute: eff.attribute,
              delta: eff.delta,
              appliedAt: eff.applied_at,
            });
          }
        }
      } else {
        await effectsQuery;
        for (const eff of input.effects) {
          persistedEffects.push({
            eventId,
            targetType: eff.targetType,
            targetId: eff.targetId,
            attribute: eff.attribute,
            delta: eff.delta,
            appliedAt: new Date().toISOString(),
          });
        }
      }
    }

    return {
      id: eventId,
      type: input.type,
      category: input.category,
      significance: input.significance,
      retentionTier,
      actorId: input.actorId ?? null,
      actorType,
      locationId: input.locationId ?? null,
      venueId: input.venueId ?? null,
      payload: input.payload ?? {},
      causedBy: input.causedBy ?? null,
      gameTimestamp,
      createdAt,
      effects: persistedEffects,
    };
  }

  /**
   * Retrieves chronological history/timeline for a specific character.
   */
  public static async getCharacterTimeline(
    characterId: string,
    options: CharacterTimelineOptions = {},
    db: any
  ): Promise<DomainEventRecord[]> {
    let query = db
      .from('evt_event')
      .select('*')
      .eq('actor_id', characterId)
      .order('game_timestamp', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    if (options.sinceGameTime) query = query.gte('game_timestamp', options.sinceGameTime);
    if (options.untilGameTime) query = query.lte('game_timestamp', options.untilGameTime);

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    let events: DomainEventRecord[] = rows.map((r: any) => this.mapRowToRecord(r));

    if (options.minSignificance) {
      const minLevel = SIGNIFICANCE_LEVELS[options.minSignificance] ?? 0;
      events = events.filter((e) => (SIGNIFICANCE_LEVELS[e.significance] ?? 0) >= minLevel);
    }

    if (options.categories && options.categories.length > 0) {
      events = events.filter((e) => options.categories!.includes(e.category));
    }

    if (options.types && options.types.length > 0) {
      events = events.filter((e) => options.types!.includes(e.type));
    }

    return events;
  }

  /**
   * Retrieves historical events that occurred in a specific geographical location.
   */
  public static async getLocationHistory(
    locationId: string,
    options: LocationTimelineOptions = {},
    db: any
  ): Promise<DomainEventRecord[]> {
    let query = db
      .from('evt_event')
      .select('*')
      .eq('location_id', locationId)
      .order('game_timestamp', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.sinceGameTime) query = query.gte('game_timestamp', options.sinceGameTime);
    if (options.untilGameTime) query = query.lte('game_timestamp', options.untilGameTime);

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    let events: DomainEventRecord[] = rows.map((r: any) => this.mapRowToRecord(r));

    if (options.minSignificance) {
      const minLevel = SIGNIFICANCE_LEVELS[options.minSignificance] ?? 0;
      events = events.filter((e) => (SIGNIFICANCE_LEVELS[e.significance] ?? 0) >= minLevel);
    }

    if (options.types && options.types.length > 0) {
      events = events.filter((e) => options.types!.includes(e.type));
    }

    return events;
  }

  /**
   * Retrieves high-significance world events for national chronicles, newspapers, and history books.
   */
  public static async getWorldChronicle(
    options: WorldChronicleOptions = {},
    db: any
  ): Promise<DomainEventRecord[]> {
    const minSignificance = options.minSignificance ?? 'significant';
    const minLevel = SIGNIFICANCE_LEVELS[minSignificance] ?? 2;

    let query = db
      .from('evt_event')
      .select('*')
      .order('game_timestamp', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.category) query = query.eq('category', options.category);
    if (options.sinceGameTime) query = query.gte('game_timestamp', options.sinceGameTime);
    if (options.untilGameTime) query = query.lte('game_timestamp', options.untilGameTime);

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    let events: DomainEventRecord[] = rows.map((r: any) => this.mapRowToRecord(r));

    // Filter by significance level
    events = events.filter((e) => (SIGNIFICANCE_LEVELS[e.significance] ?? 0) >= minLevel);

    if (options.types && options.types.length > 0) {
      events = events.filter((e) => options.types!.includes(e.type));
    }

    return events;
  }

  /**
   * Traces the causal graph for an event (ancestor causes and subsequent consequences).
   */
  public static async getCausalTrace(eventId: string, db: any): Promise<CausalTraceResult | null> {
    const { data: targetRow, error } = await db
      .from('evt_event')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (error || !targetRow) return null;

    const target = this.mapRowToRecord(targetRow);

    // 1. Trace ancestors upwards
    const ancestors: DomainEventRecord[] = [];
    let currentParentId = target.causedBy;
    const visited = new Set<string>([target.id]);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const { data: parentRow } = await db
        .from('evt_event')
        .select('*')
        .eq('id', currentParentId)
        .maybeSingle();

      if (!parentRow) break;
      const parentRecord = this.mapRowToRecord(parentRow);
      ancestors.unshift(parentRecord); // Keep chronological order (oldest first)
      currentParentId = parentRecord.causedBy;
    }

    // 2. Trace immediate consequences downwards
    const consequences: DomainEventRecord[] = [];
    const { data: childRows } = await db
      .from('evt_event')
      .select('*')
      .eq('caused_by', eventId)
      .order('game_timestamp', { ascending: true });

    if (Array.isArray(childRows)) {
      for (const row of childRows) {
        consequences.push(this.mapRowToRecord(row));
      }
    }

    return {
      target,
      ancestors,
      consequences,
    };
  }

  /**
   * Maps raw database row into typed DomainEventRecord.
   */
  private static mapRowToRecord(row: any): DomainEventRecord {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      significance: row.significance,
      retentionTier: row.retention_tier ?? deriveRetentionTier(row.significance),
      actorId: row.actor_id ?? null,
      actorType: row.actor_type ?? (row.actor_id ? 'character' : 'system'),
      locationId: row.location_id ?? null,
      venueId: row.venue_id ?? null,
      payload: row.payload ?? {},
      causedBy: row.caused_by ?? null,
      gameTimestamp: row.game_timestamp,
      createdAt: row.created_at,
    };
  }
}
