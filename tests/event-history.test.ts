import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommandPipeline } from '../lib/commands/pipeline';
import { defineCommand, registerCommand } from '../lib/commands/registry';
import { Commands, Command } from '../lib/types/command-types';
import { CommandExecutionContext } from '../lib/commands/types';
import { EventService } from '../domains/events/service';
import { deriveRetentionTier, CreateDomainEventInput } from '../domains/events/types';
import { WorldTimeService } from '../domains/world-time/service';

describe('Event & History Foundation (Hybrid Architecture)', () => {
  let mockDb: Record<string, any>;
  let insertedEvents: any[];
  let insertedEffects: any[];
  let stateStore: Record<string, any>;

  beforeEach(() => {
    insertedEvents = [];
    insertedEffects = [];
    stateStore = {
      chr_character_state: new Map<string, any>(),
    };

    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'evt_event') {
          return {
            insert: vi.fn((record: any) => {
              const rows = Array.isArray(record) ? record : [record];
              const created = rows.map((r, idx) => ({
                id: `evt-uuid-${insertedEvents.length + idx + 1}`,
                created_at: new Date().toISOString(),
                ...r,
              }));
              insertedEvents.push(...created);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: created[0],
                    error: null,
                  }),
                })),
                data: created[0],
                error: null,
              };
            }),
            select: vi.fn((cols: string) => {
              let filtered = [...insertedEvents];
              const queryBuilder: any = {
                eq: vi.fn((col: string, val: any) => {
                  filtered = filtered.filter((r) => r[col] === val);
                  return queryBuilder;
                }),
                gte: vi.fn((col: string, val: any) => {
                  filtered = filtered.filter((r) => new Date(r[col]) >= new Date(val));
                  return queryBuilder;
                }),
                lte: vi.fn((col: string, val: any) => {
                  filtered = filtered.filter((r) => new Date(r[col]) <= new Date(val));
                  return queryBuilder;
                }),
                order: vi.fn((col: string, opts: any) => {
                  filtered.sort((a, b) => {
                    const valA = new Date(a[col]).getTime();
                    const valB = new Date(b[col]).getTime();
                    return opts?.ascending ? valA - valB : valB - valA;
                  });
                  return queryBuilder;
                }),
                limit: vi.fn((limit: number) => {
                  filtered = filtered.slice(0, limit);
                  return queryBuilder;
                }),
                maybeSingle: vi.fn().mockImplementation(() => ({
                  data: filtered[0] ?? null,
                  error: null,
                })),
                then: (resolve: any) => resolve({ data: filtered, error: null }),
              };
              return queryBuilder;
            }),
          };
        }

        if (table === 'evt_effect') {
          return {
            insert: vi.fn((records: any) => {
              const rows = Array.isArray(records) ? records : [records];
              insertedEffects.push(...rows);
              return {
                select: vi.fn(() => ({
                  data: rows.map((r, idx) => ({ id: `eff-${idx}`, ...r, applied_at: new Date().toISOString() })),
                  error: null,
                })),
                error: null,
              };
            }),
          };
        }

        if (table === 'chr_character_state') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: stateStore.chr_character_state.get(val) ?? null,
                  error: null,
                }),
              })),
            })),
            upsert: vi.fn((data: any) => {
              stateStore.chr_character_state.set(data.character_id, data);
              return { error: null };
            }),
          };
        }

        if (table === 'geo_location') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'loc-surulere', name: 'Surulere' },
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === 'acct_active_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    character_id: 'char-fashola-001',
                    acct_account: { user_id: 'user-auth-1', status: 'active' },
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === 'cmd_idempotency') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'obs_command_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  });

  describe('Hybrid Architecture Principle', () => {
    it('proves that a consequential command mutates current state directly without requiring pure event sourcing', async () => {
      // Setup initial mutable state
      const charId = 'char-fashola-001';
      stateStore.chr_character_state.set(charId, {
        character_id: charId,
        location_id: 'loc-yaba',
        venue_id: null,
        status: 'active',
      });

      const fixedGameTime = new Date('2026-10-11T12:00:00Z');
      const ctx: CommandExecutionContext = {
        db: mockDb as any,
        actorId: 'user-auth-1',
        characterId: charId,
        gameTime: fixedGameTime,
      };

      // Define a consequential command: MOVE_CHARACTER
      const moveDef = defineCommand({
        type: Commands.MOVE_CHARACTER,
        validate: async (cmd) => Boolean(cmd.payload.targetLocationId),
        simulate: async (cmd, c) => {
          const targetLoc = cmd.payload.targetLocationId;
          const prevLoc = stateStore.chr_character_state.get(charId)?.location_id ?? null;

          return {
            state: {
              characterId: charId,
              fromLocationId: prevLoc,
              toLocationId: targetLoc,
            },
            events: [
              {
                type: 'CHARACTER_MOVED',
                category: 'action',
                significance: 'trivial',
                actor_id: charId,
                location_id: targetLoc,
                payload: { from: prevLoc, to: targetLoc },
                effects: [
                  {
                    target_type: 'character',
                    target_id: charId,
                    attribute: 'location_id',
                    delta: { from: prevLoc, to: targetLoc },
                  },
                ],
              },
            ],
            // Direct mutable state change for fast gameplay
            stateMutations: async () => {
              stateStore.chr_character_state.set(charId, {
                character_id: charId,
                location_id: targetLoc,
                venue_id: null,
                status: 'active',
              });
            },
          };
        },
      });

      const cmd: Command<{ targetLocationId: string }> = {
        type: Commands.MOVE_CHARACTER,
        payload: { targetLocationId: 'loc-surulere' },
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(cmd, moveDef, ctx);
      expect(result.ok).toBe(true);

      // 1. Current state is directly updated and immediately queryable in O(1) without replaying history
      const currentState = stateStore.chr_character_state.get(charId);
      expect(currentState.location_id).toBe('loc-surulere');

      // 2. Simultaneously, a durable historical event was persisted to evt_event
      expect(insertedEvents.length).toBe(1);
      const recordedEvent = insertedEvents[0];
      expect(recordedEvent.type).toBe('CHARACTER_MOVED');
      expect(recordedEvent.actor_id).toBe(charId);
      expect(recordedEvent.actor_type).toBe('character');
      expect(recordedEvent.location_id).toBe('loc-surulere');
      expect(recordedEvent.significance).toBe('trivial');
      expect(recordedEvent.retention_tier).toBe('ephemeral');
      expect(recordedEvent.game_timestamp).toBe(fixedGameTime.toISOString());
      expect(recordedEvent.payload).toEqual({ from: 'loc-yaba', to: 'loc-surulere' });

      // 3. Simultaneously, the polymorphic effect was recorded in evt_effect
      expect(insertedEffects.length).toBe(1);
      const recordedEffect = insertedEffects[0];
      expect(recordedEffect.target_type).toBe('character');
      expect(recordedEffect.target_id).toBe(charId);
      expect(recordedEffect.attribute).toBe('location_id');
      expect(recordedEffect.delta).toEqual({ from: 'loc-yaba', to: 'loc-surulere' });
    });
  });

  describe('Durable Domain Event Structure', () => {
    it('records who acted, what happened, game time, real time, effects, payload, causal parent, and retention', async () => {
      const fixedGameTime = new Date('2026-10-15T09:30:00Z');
      const worldClock = new WorldTimeService({
        id: 'clock-1',
        epochReal: new Date('2026-10-15T09:00:00Z'),
        epochGame: new Date('2026-10-15T09:00:00Z'),
        scaleFactor: 60,
        paused: false,
        pausedAt: null,
      });

      // Parent event (e.g., land acquired)
      const parentInput: CreateDomainEventInput = {
        type: 'PROPERTY_ACQUIRED',
        category: 'action',
        significance: 'significant',
        actorId: 'char-folake-002',
        locationId: 'loc-ikeja',
        payload: { property_title: 'Plot 4, Allen Avenue', price_ngn: 25000000 },
        gameTimestamp: fixedGameTime.toISOString(),
        effects: [
          {
            targetType: 'venue',
            targetId: 'venue-plot-4',
            attribute: 'ownership',
            delta: { new_owner: 'char-folake-002' },
          },
        ],
      };

      const parentEvent = await EventService.recordEvent(parentInput, {
        db: mockDb,
        worldTimeService: worldClock,
      });

      expect(parentEvent.id).toBeDefined();
      expect(parentEvent.actorId).toBe('char-folake-002');
      expect(parentEvent.actorType).toBe('character');
      expect(parentEvent.type).toBe('PROPERTY_ACQUIRED');
      expect(parentEvent.category).toBe('action');
      expect(parentEvent.significance).toBe('significant');
      expect(parentEvent.retentionTier).toBe('permanent');
      expect(parentEvent.gameTimestamp).toBe(fixedGameTime.toISOString());
      expect(parentEvent.createdAt).toBeDefined();

      // Child event caused by the property acquisition (e.g., new business opened on that plot)
      const childInput: CreateDomainEventInput = {
        type: 'BUSINESS_OPENED',
        category: 'world',
        significance: 'historic',
        actorId: 'char-folake-002',
        locationId: 'loc-ikeja',
        venueId: 'venue-plot-4',
        causedBy: parentEvent.id, // Explicit causal link!
        payload: { business_name: 'Mama Put Deluxe', category: 'hospitality' },
        effects: [
          {
            targetType: 'location',
            targetId: 'loc-ikeja',
            attribute: 'commercial_density',
            delta: { increase: 1 },
          },
        ],
      };

      const childEvent = await EventService.recordEvent(childInput, {
        db: mockDb,
        worldTimeService: worldClock,
      });

      expect(childEvent.causedBy).toBe(parentEvent.id);
      expect(childEvent.significance).toBe('historic');
      expect(childEvent.retentionTier).toBe('permanent');
      expect(childEvent.effects?.length).toBe(1);
    });

    it('correctly maps retention tier based on event significance', () => {
      expect(deriveRetentionTier('trivial')).toBe('ephemeral');
      expect(deriveRetentionTier('minor')).toBe('standard');
      expect(deriveRetentionTier('significant')).toBe('permanent');
      expect(deriveRetentionTier('historic')).toBe('permanent');
    });
  });

  describe('Historical Storytelling & Institutional Memory', () => {
    beforeEach(async () => {
      // Seed historical scenario: Political crisis in Lagos
      // 1. Law passed
      const evt1 = await EventService.recordEvent(
        {
          type: 'LAW_PASSED',
          category: 'world',
          significance: 'historic',
          actorId: null, // National assembly / system
          actorType: 'system',
          locationId: 'loc-ikeja',
          payload: { law_title: 'State Transport Reform Act', bill_no: 'HB-104' },
          gameTimestamp: '2026-10-01T10:00:00Z',
        },
        { db: mockDb }
      );

      // 2. Protest erupted as consequence of the law
      const evt2 = await EventService.recordEvent(
        {
          type: 'PROTEST_OCCURRED',
          category: 'consequence',
          significance: 'significant',
          actorId: 'char-activist-01',
          locationId: 'loc-ikeja',
          causedBy: evt1.id, // Caused by law
          payload: { crowd_size: 5000, slogan: 'We No Go Agree' },
          gameTimestamp: '2026-10-02T14:00:00Z',
        },
        { db: mockDb }
      );

      // 3. Governor impeached / removed as consequence of the crisis
      await EventService.recordEvent(
        {
          type: 'GOVERNOR_REMOVED',
          category: 'world',
          significance: 'historic',
          actorId: 'char-governor-01',
          locationId: 'loc-ikeja',
          causedBy: evt2.id, // Caused by protest
          payload: { vote_margin: '28-2', reason: 'Loss of public trust' },
          gameTimestamp: '2026-10-05T16:00:00Z',
        },
        { db: mockDb }
      );

      // 4. Routine trivial event in the same location (e.g. routine street vendor sale)
      await EventService.recordEvent(
        {
          type: 'ITEM_SOLD',
          category: 'action',
          significance: 'trivial',
          actorId: 'char-vendor-01',
          locationId: 'loc-ikeja',
          payload: { item: 'Gala Sausage', price_ngn: 200 },
          gameTimestamp: '2026-10-03T11:00:00Z',
        },
        { db: mockDb }
      );
    });

    it('retrieves high-significance world chronicle for national institutional memory', async () => {
      // Query world chronicle (historic & significant events only)
      const chronicle = await EventService.getWorldChronicle(
        { minSignificance: 'significant' },
        mockDb
      );

      expect(chronicle.length).toBe(3);
      // Verify descending game timestamp order
      expect(chronicle[0].type).toBe('GOVERNOR_REMOVED');
      expect(chronicle[1].type).toBe('PROTEST_OCCURRED');
      expect(chronicle[2].type).toBe('LAW_PASSED');

      // Trivial vendor sale is excluded from the high-significance chronicle!
      expect(chronicle.some((e) => e.type === 'ITEM_SOLD')).toBe(false);
    });

    it('retrieves location institutional memory', async () => {
      const history = await EventService.getLocationHistory(
        'loc-ikeja',
        { minSignificance: 'minor' },
        mockDb
      );

      expect(history.length).toBe(3);
      expect(history.map((h) => h.type)).toEqual([
        'GOVERNOR_REMOVED',
        'PROTEST_OCCURRED',
        'LAW_PASSED',
      ]);
    });

    it('traces complete causal graph backwards and forwards for storytelling explanation', async () => {
      const governorRemovalEvent = insertedEvents.find((e) => e.type === 'GOVERNOR_REMOVED');
      expect(governorRemovalEvent).toBeDefined();

      const trace = await EventService.getCausalTrace(governorRemovalEvent.id, mockDb);
      expect(trace).not.toBeNull();
      expect(trace!.target.type).toBe('GOVERNOR_REMOVED');

      // Ancestors trace: Law Passed -> Protest Occurred -> Governor Removed
      expect(trace!.ancestors.length).toBe(2);
      expect(trace!.ancestors[0].type).toBe('LAW_PASSED'); // Oldest root cause
      expect(trace!.ancestors[1].type).toBe('PROTEST_OCCURRED'); // Immediate cause

      // Check consequences of the law
      const lawEvent = insertedEvents.find((e) => e.type === 'LAW_PASSED');
      const lawTrace = await EventService.getCausalTrace(lawEvent.id, mockDb);
      expect(lawTrace!.consequences.length).toBe(1);
      expect(lawTrace!.consequences[0].type).toBe('PROTEST_OCCURRED');
    });

    it('retrieves character personal timeline for biographical storytelling', async () => {
      const activistTimeline = await EventService.getCharacterTimeline(
        'char-activist-01',
        {},
        mockDb
      );

      expect(activistTimeline.length).toBe(1);
      expect(activistTimeline[0].type).toBe('PROTEST_OCCURRED');
      expect(activistTimeline[0].significance).toBe('significant');
    });
  });
});
