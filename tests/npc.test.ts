import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NpcService } from '../domains/npc/service';
import {
  CANONICAL_NPC_IDS,
  DEFAULT_NPC_ROUTINES,
  resolveScheduledBlockForHour,
} from '../domains/npc/routines';
import { NpcRole, NpcProfile } from '../domains/npc/types';

describe('Meaningful NPC and Gameplay Loop Foundation', () => {
  let mockCharacters: Map<string, any>;
  let mockCharacterStates: Map<string, any>;
  let mockCharacterStats: Map<string, any>;
  let mockNpcProfiles: Map<string, any>;
  let mockWallets: Map<string, any>;
  let mockEmployments: Map<string, any>;
  let mockWorkSessions: Map<string, any>;
  let mockTransactions: any[];
  let mockEvents: any[];
  let mockRelationships: Map<string, any>;
  let mockReputations: Map<string, any>;
  let mockItemCatalog: Map<string, any>;
  let mockDb: any;

  beforeEach(() => {
    mockCharacters = new Map();
    mockCharacterStates = new Map();
    mockCharacterStats = new Map();
    mockNpcProfiles = new Map();
    mockWallets = new Map();
    mockEmployments = new Map();
    mockWorkSessions = new Map();
    mockTransactions = [];
    mockEvents = [];
    mockRelationships = new Map();
    mockReputations = new Map();
    mockItemCatalog = new Map();

    // 1. Seed Item Catalog (Port Harcourt Cuisine)
    mockItemCatalog.set('Port Harcourt Bole & Fish', {
      id: 'item-bole-fish',
      name: 'Port Harcourt Bole & Fish',
      category: 'food',
      price: 1500,
      energy_delta: 35,
      hunger_delta: -50,
      is_durable: false,
    });
    mockItemCatalog.set('Jollof Rice & Chicken', {
      id: 'item-jollof',
      name: 'Jollof Rice & Chicken',
      category: 'food',
      price: 1500,
      energy_delta: 30,
      hunger_delta: -50,
      is_durable: false,
    });

    // 2. Seed Canonical Port Harcourt NPCs
    // Mama Tarila (Food Vendor / Bole Queen)
    mockCharacters.set(CANONICAL_NPC_IDS.MAMA_TARILA, {
      id: CANONICAL_NPC_IDS.MAMA_TARILA,
      display_name: 'Mama Tarila (Tarilaere Briggs)',
      is_npc: true,
      status: 'alive',
    });
    mockCharacterStates.set(CANONICAL_NPC_IDS.MAMA_TARILA, {
      character_id: CANONICAL_NPC_IDS.MAMA_TARILA,
      location_id: 'zone-olu-obasanjo-rd',
      venue_id: 'venue-mama-tarila-bole',
      status: 'active',
    });
    mockCharacterStats.set(CANONICAL_NPC_IDS.MAMA_TARILA, {
      character_id: CANONICAL_NPC_IDS.MAMA_TARILA,
      energy: 95,
      hunger: 10,
      health: 100,
      job_title: 'Bole & Fish Proprietress',
    });
    mockWallets.set(CANONICAL_NPC_IDS.MAMA_TARILA, {
      id: 'wal-mama',
      character_id: CANONICAL_NPC_IDS.MAMA_TARILA,
      owner_type: 'character',
      balance: 25000,
      currency: 'NGN',
    });
    mockNpcProfiles.set(CANONICAL_NPC_IDS.MAMA_TARILA, {
      character_id: CANONICAL_NPC_IDS.MAMA_TARILA,
      role: 'food_vendor',
      schedule_type: 'standard_shift',
      home_venue_id: 'venue-mama-tarila-bole',
      work_venue_id: 'venue-mama-tarila-bole',
      current_activity: 'working',
      routine: DEFAULT_NPC_ROUTINES.food_vendor,
      dialogue: {
        greeting: ['Welcome, my person! Correct Port Harcourt Bole and fish dey hot!'],
      },
      metadata: {},
    });

    // Elder Tamuno (Commercial Keke Operator)
    mockCharacters.set(CANONICAL_NPC_IDS.ELDER_TAMUNO, {
      id: CANONICAL_NPC_IDS.ELDER_TAMUNO,
      display_name: 'Elder Tamuno (Tamunominabo Peters)',
      is_npc: true,
      status: 'alive',
    });
    mockCharacterStates.set(CANONICAL_NPC_IDS.ELDER_TAMUNO, {
      character_id: CANONICAL_NPC_IDS.ELDER_TAMUNO,
      location_id: 'zone-olu-obasanjo-rd',
      venue_id: 'venue-garrison-keke-park',
      status: 'active',
    });
    mockCharacterStats.set(CANONICAL_NPC_IDS.ELDER_TAMUNO, {
      character_id: CANONICAL_NPC_IDS.ELDER_TAMUNO,
      energy: 90,
      hunger: 30, // Hungry enough to eat lunch!
      health: 95,
      job_title: 'Commercial Keke Operator',
    });
    mockWallets.set(CANONICAL_NPC_IDS.ELDER_TAMUNO, {
      id: 'wal-tamuno',
      character_id: CANONICAL_NPC_IDS.ELDER_TAMUNO,
      owner_type: 'character',
      balance: 5000,
      currency: 'NGN',
    });
    mockNpcProfiles.set(CANONICAL_NPC_IDS.ELDER_TAMUNO, {
      character_id: CANONICAL_NPC_IDS.ELDER_TAMUNO,
      role: 'transport_rider',
      schedule_type: 'standard_shift',
      home_venue_id: 'venue-garrison-keke-park',
      work_venue_id: 'venue-garrison-keke-park',
      current_activity: 'working',
      routine: DEFAULT_NPC_ROUTINES.transport_rider,
      dialogue: {
        greeting: ['Waterlines straight! 200 naira per drop!'],
      },
      metadata: {},
    });

    // Inspector Friday (Community Patrol / Garden City Watch)
    mockCharacters.set(CANONICAL_NPC_IDS.INSPECTOR_FRIDAY, {
      id: CANONICAL_NPC_IDS.INSPECTOR_FRIDAY,
      display_name: 'Inspector Friday (Friday Amadi)',
      is_npc: true,
      status: 'alive',
    });
    mockCharacterStates.set(CANONICAL_NPC_IDS.INSPECTOR_FRIDAY, {
      character_id: CANONICAL_NPC_IDS.INSPECTOR_FRIDAY,
      location_id: 'zone-olu-obasanjo-rd',
      venue_id: 'venue-garrison-keke-park',
      status: 'active',
    });
    mockCharacterStats.set(CANONICAL_NPC_IDS.INSPECTOR_FRIDAY, {
      character_id: CANONICAL_NPC_IDS.INSPECTOR_FRIDAY,
      energy: 100,
      hunger: 15,
      health: 100,
      job_title: 'Community Safety Officer',
    });
    mockWallets.set(CANONICAL_NPC_IDS.INSPECTOR_FRIDAY, {
      id: 'wal-friday',
      character_id: CANONICAL_NPC_IDS.INSPECTOR_FRIDAY,
      owner_type: 'character',
      balance: 8000,
      currency: 'NGN',
    });
    mockNpcProfiles.set(CANONICAL_NPC_IDS.INSPECTOR_FRIDAY, {
      character_id: CANONICAL_NPC_IDS.INSPECTOR_FRIDAY,
      role: 'community_patrol',
      schedule_type: 'standard_shift',
      home_venue_id: 'venue-garrison-keke-park',
      work_venue_id: 'venue-garrison-keke-park',
      current_activity: 'patrolling',
      routine: DEFAULT_NPC_ROUTINES.community_patrol,
      dialogue: {
        greeting: ['Good day my brother. Garden City dey calm and secured.'],
      },
      metadata: {},
    });

    // Seed Player Character: Emeka in Port Harcourt
    const playerId = 'char-player-emeka';
    mockCharacters.set(playerId, {
      id: playerId,
      display_name: 'Emeka Obi (Player)',
      is_npc: false,
      status: 'alive',
    });
    mockCharacterStates.set(playerId, {
      character_id: playerId,
      location_id: 'zone-olu-obasanjo-rd',
      venue_id: 'venue-mama-tarila-bole', // Player is sitting inside Mama Tarila Bole Joint
      status: 'active',
    });
    mockCharacterStats.set(playerId, {
      character_id: playerId,
      energy: 60,
      hunger: 45,
      health: 100,
      job_title: 'D-Line Trader',
    });
    mockWallets.set(playerId, {
      id: 'wal-player-emeka',
      character_id: playerId,
      owner_type: 'character',
      balance: 10000,
      currency: 'NGN',
    });

    // Mock DB construction
    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'npc_profile') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockNpcProfiles.get(val) ?? null,
                  error: null,
                })),
              })),
              then: (resolve: any) => resolve({ data: Array.from(mockNpcProfiles.values()), error: null }),
            })),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockNpcProfiles.get(val);
                if (existing) {
                  mockNpcProfiles.set(val, { ...existing, ...updates });
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'chr_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockCharacters.get(val) ?? null,
                  error: null,
                })),
              })),
            })),
          };
        }

        if (table === 'chr_character_state') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockCharacterStates.get(val) ?? null,
                  error: null,
                })),
                neq: vi.fn((col2: string, val2: any) => ({
                  limit: vi.fn().mockImplementation(async (limitCount: number) => {
                    const matches = Array.from(mockCharacterStates.values())
                      .filter((s) => s[col] === val && s[col2] !== val2)
                      .slice(0, limitCount);
                    return { data: matches, error: null };
                  }),
                })),
              })),
            })),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockCharacterStates.get(val);
                if (existing) {
                  mockCharacterStates.set(val, { ...existing, ...updates });
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'chr_character_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockCharacterStats.get(val) ?? null,
                  error: null,
                })),
              })),
            })),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockCharacterStats.get(val);
                if (existing) {
                  mockCharacterStats.set(val, { ...existing, ...updates });
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'eco_wallet') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockWallets.get(val) ?? null,
                  error: null,
                })),
              })),
            })),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockWallets.get(val);
                if (existing) {
                  mockWallets.set(val, { ...existing, ...updates });
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'eco_item_catalog') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockItemCatalog.get(val) ?? null,
                  error: null,
                })),
              })),
            })),
          };
        }

        if (table === 'eco_employment') {
          const createEmpQuery = (filters: Record<string, any> = {}) => ({
            eq: vi.fn((col: string, val: any) => createEmpQuery({ ...filters, [col]: val })),
            maybeSingle: vi.fn().mockImplementation(async () => {
              for (const emp of mockEmployments.values()) {
                const match = Object.entries(filters).every(([k, v]) => emp[k] === v);
                if (match) return { data: emp, error: null };
              }
              return { data: null, error: null };
            }),
          });

          return {
            select: vi.fn(() => createEmpQuery()),
            insert: vi.fn((record: any) => {
              const id = record.id ?? `emp-${mockEmployments.size + 1}`;
              const merged = { id, ...record };
              mockEmployments.set(id, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'eco_work_session') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                is: vi.fn((col2: string, val2: any) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    for (const ws of mockWorkSessions.values()) {
                      if (ws[col] === val && ws.ended_at_real === null) return { data: ws, error: null };
                    }
                    return { data: null, error: null };
                  }),
                })),
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: mockWorkSessions.get(val) ?? null,
                  error: null,
                })),
              })),
            })),
            insert: vi.fn((record: any) => {
              const id = record.id ?? `ws-${mockWorkSessions.size + 1}`;
              const merged = { id, ended_at_real: null, ...record };
              mockWorkSessions.set(id, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockWorkSessions.get(val);
                if (existing) {
                  mockWorkSessions.set(val, { ...existing, ...updates });
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'eco_transaction') {
          return {
            insert: vi.fn((record: any) => {
              const id = `txn-${mockTransactions.length + 1}`;
              const merged = { id, ...record };
              mockTransactions.push(merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'soc_relationship') {
          const createRelQuery = (filters: Record<string, any> = {}) => ({
            eq: vi.fn((col: string, val: any) => createRelQuery({ ...filters, [col]: val })),
            maybeSingle: vi.fn().mockImplementation(async () => {
              for (const rel of mockRelationships.values()) {
                const match = Object.entries(filters).every(([k, v]) => rel[k] === v);
                if (match) return { data: rel, error: null };
              }
              return { data: null, error: null };
            }),
          });

          return {
            select: vi.fn(() => createRelQuery()),
            upsert: vi.fn((record: any) => {
              const key = `${record.actor_id}:${record.target_id}:${record.type}`;
              const existing = mockRelationships.get(key);
              const id = existing?.id ?? `rel-${mockRelationships.size + 1}`;
              const merged = { id, ...record };
              mockRelationships.set(key, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                for (const [key, rel] of mockRelationships.entries()) {
                  if (rel.id === val) {
                    mockRelationships.set(key, { ...rel, ...updates });
                  }
                }
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'soc_reputation') {
          const createRepQuery = (filters: Record<string, any> = {}) => ({
            eq: vi.fn((col: string, val: any) => createRepQuery({ ...filters, [col]: val })),
            is: vi.fn((col: string, val: any) => createRepQuery({ ...filters, [col]: val })),
            maybeSingle: vi.fn().mockImplementation(async () => {
              for (const rep of mockReputations.values()) {
                const match = Object.entries(filters).every(([k, v]) => {
                  if (v === null) return rep[k] === null || rep[k] === undefined;
                  return rep[k] === v;
                });
                if (match) return { data: rep, error: null };
              }
              return { data: null, error: null };
            }),
          });

          return {
            select: vi.fn(() => createRepQuery()),
            upsert: vi.fn((record: any) => {
              const key = `${record.character_id}:${record.dimension}:${record.scope_type}:${record.scope_id ?? 'global'}`;
              const existing = mockReputations.get(key);
              const id = existing?.id ?? `rep-${mockReputations.size + 1}`;
              const merged = { id, ...record };
              mockReputations.set(key, merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'evt_event') {
          return {
            insert: vi.fn((record: any) => {
              const id = `evt-${mockEvents.length + 1}`;
              const merged = { id, ...record };
              mockEvents.push(merged);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: merged, error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'obs_tick_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
      rpc: vi.fn(async (funcName: string, args: any) => {
        if (funcName === 'eco_transfer_funds') {
          const fromWallet = args.p_from_id ? mockWallets.get(args.p_from_id) : null;
          const toWallet = args.p_to_id ? mockWallets.get(args.p_to_id) : null;

          if (fromWallet) {
            fromWallet.balance -= Number(args.p_amount);
          }
          if (toWallet) {
            toWallet.balance += Number(args.p_amount);
          }

          const txnId = `txn-${mockTransactions.length + 1}`;
          mockTransactions.push({
            id: txnId,
            from_id: args.p_from_id,
            to_id: args.p_to_id,
            amount: args.p_amount,
            source_type: args.p_source_type,
            reason: args.p_reason,
            idempotency_key: args.p_idempotency_key,
          });

          return {
            data: {
              status: 'success',
              transaction_id: txnId,
              amount: args.p_amount,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    };
  });

  // ==========================================================================
  // Test 1: NPC Profile Retrieval & State Initialization
  // ==========================================================================
  it('retrieves registered NPC profiles and complete character states', async () => {
    const profiles = await NpcService.getNpcProfiles(mockDb);
    expect(profiles.length).toBe(3);

    const mamaProfile = profiles.find((p) => p.characterId === CANONICAL_NPC_IDS.MAMA_TARILA);
    expect(mamaProfile).toBeDefined();
    expect(mamaProfile?.role).toBe('food_vendor');
    expect(mamaProfile?.routine.length).toBeGreaterThan(0);

    const mamaState = await NpcService.getNpcState(CANONICAL_NPC_IDS.MAMA_TARILA, mockDb);
    expect(mamaState).not.toBeNull();
    expect(mamaState?.displayName).toContain('Mama Tarila');
    expect(mamaState?.walletBalance).toBe(25000);
    expect(mamaState?.venueId).toBe('venue-mama-tarila-bole');
  });

  // ==========================================================================
  // Test 2: Deterministic Schedule Resolution Across 24 Hours
  // ==========================================================================
  it('deterministically resolves NPC activity and target location by hour', () => {
    const routine = DEFAULT_NPC_ROUTINES.food_vendor;

    // 03:00 UTC -> sleeping
    const nightBlock = resolveScheduledBlockForHour(routine, 3);
    expect(nightBlock.activity).toBe('sleeping');

    // 07:00 UTC -> commuting/prep
    const morningBlock = resolveScheduledBlockForHour(routine, 7);
    expect(morningBlock.activity).toBe('commuting');

    // 10:00 UTC -> working
    const workBlock = resolveScheduledBlockForHour(routine, 10);
    expect(workBlock.activity).toBe('working');

    // 13:00 UTC -> lunch break / eating
    const lunchBlock = resolveScheduledBlockForHour(routine, 13);
    expect(lunchBlock.activity).toBe('eating');

    // 19:00 UTC -> socializing
    const eveningBlock = resolveScheduledBlockForHour(routine, 19);
    expect(eveningBlock.activity).toBe('socializing');
  });

  // ==========================================================================
  // Test 3: Autonomous NPC Work Session Lifecycle
  // ==========================================================================
  it('starts work sessions when entering working hours and pays wages upon shift conclusion', async () => {
    // 10:00 UTC -> Working hour
    const morningTime = new Date('2026-10-11T10:00:00Z');
    const tickResult1 = await NpcService.simulateTick({ gameTime: morningTime }, mockDb);

    expect(tickResult1.processedNpcCount).toBe(3);
    const startActions = tickResult1.actionsExecuted.filter((a) => a.actionType === 'started_work');
    expect(startActions.length).toBeGreaterThan(0);

    // Verify work session was created
    expect(mockWorkSessions.size).toBeGreaterThan(0);

    // 19:00 UTC -> Evening socializing hour (shift concludes)
    const eveningTime = new Date('2026-10-11T19:00:00Z');
    const tickResult2 = await NpcService.simulateTick({ gameTime: eveningTime }, mockDb);

    const endActions = tickResult2.actionsExecuted.filter((a) => a.actionType === 'ended_work');
    expect(endActions.length).toBeGreaterThan(0);

    // Verify that ending work paid wages into wallet and recorded transaction
    const endAction = endActions[0];
    expect(endAction.details.earned).toBeGreaterThan(0);
    expect(mockTransactions.some((t) => t.source_type === 'employment')).toBe(true);
  });

  // ==========================================================================
  // Test 4: Autonomous Inter-NPC Economic Commerce (Baba Musbau buys from Mama Nkechi)
  // ==========================================================================
  it('executes autonomous inter-NPC commerce during lunch hour', async () => {
    const musbauInitialWallet = mockWallets.get(CANONICAL_NPC_IDS.BABA_MUSBAU).balance; // 5000
    const mamaInitialWallet = mockWallets.get(CANONICAL_NPC_IDS.MAMA_NKECHI).balance;   // 25000

    // Set Baba Musbau's schedule block to lunch hour: 13:00 UTC
    const lunchTime = new Date('2026-10-11T13:00:00Z');
    const tickResult = await NpcService.simulateTick({ gameTime: lunchTime }, mockDb);

    const purchaseActions = tickResult.actionsExecuted.filter((a) => a.actionType === 'purchased_food');
    expect(purchaseActions.length).toBeGreaterThan(0);

    const purchase = purchaseActions[0];
    expect(purchase.characterId).toBe(CANONICAL_NPC_IDS.BABA_MUSBAU);
    expect(purchase.details.vendorId).toBe(CANONICAL_NPC_IDS.MAMA_NKECHI);
    expect(purchase.details.price).toBe(1500);

    // Economic consistency checks: Baba Musbau spent 1500, Mama Nkechi gained sales
    const musbauFinalWallet = mockWallets.get(CANONICAL_NPC_IDS.BABA_MUSBAU).balance;
    const mamaFinalWallet = mockWallets.get(CANONICAL_NPC_IDS.MAMA_NKECHI).balance;

    expect(musbauFinalWallet).toBe(musbauInitialWallet - 1500); // 3500
    expect(mamaFinalWallet).toBeGreaterThanOrEqual(mamaInitialWallet + 1500); // Mama earned from lunch customers

    // Verify transaction history & domain events recorded
    const lunchTxn = mockTransactions.find(
      (t) => t.from_id === CANONICAL_NPC_IDS.BABA_MUSBAU && t.to_id === CANONICAL_NPC_IDS.MAMA_NKECHI
    );
    expect(lunchTxn).toBeDefined();
    expect(lunchTxn.amount).toBe(1500);

    const purchaseEvent = mockEvents.find((e) => e.type === 'ITEM_PURCHASED');
    expect(purchaseEvent).toBeDefined();
    expect(purchaseEvent.actor_id).toBe(CANONICAL_NPC_IDS.BABA_MUSBAU);
  });

  // ==========================================================================
  // Test 5: Player-to-NPC Interactions (Talking and Buying Food)
  // ==========================================================================
  it('allows players to greet NPCs and purchase items directly from NPC vendors', async () => {
    const playerId = 'char-player-emeka';
    const playerInitialBalance = mockWallets.get(playerId).balance; // 10000
    const mamaInitialBalance = mockWallets.get(CANONICAL_NPC_IDS.MAMA_NKECHI).balance; // 25000

    // 1. Player greets Officer Danladi
    const greetOutcome = await NpcService.interact(
      playerId,
      CANONICAL_NPC_IDS.OFFICER_DANLADI,
      'greet',
      mockDb
    );

    expect(greetOutcome.npcId).toBe(CANONICAL_NPC_IDS.OFFICER_DANLADI);
    expect(greetOutcome.dialogueText.length).toBeGreaterThan(0);
    expect(greetOutcome.relationshipStrength).toBeGreaterThanOrEqual(5);

    // Verify relationship was created in social domain
    const relKey = `${playerId}:${CANONICAL_NPC_IDS.OFFICER_DANLADI}:friend`;
    expect(mockRelationships.has(relKey)).toBe(true);

    // 2. Player buys food from Mama Nkechi
    const buyOutcome = await NpcService.interact(
      playerId,
      CANONICAL_NPC_IDS.MAMA_NKECHI,
      'buy_food',
      mockDb
    );

    expect(buyOutcome.transactionId).toBeDefined();
    expect(mockWallets.get(playerId).balance).toBe(playerInitialBalance - 1500);
    expect(mockWallets.get(CANONICAL_NPC_IDS.MAMA_NKECHI).balance).toBe(mamaInitialBalance + 1500);

    // Verify player stats updated (hunger decreased, energy increased)
    const playerStats = mockCharacterStats.get(playerId);
    expect(playerStats.energy).toBeGreaterThan(60);
    expect(playerStats.hunger).toBeLessThan(45);
  });

  // ==========================================================================
  // Test 6: NPC Autonomous Co-Presence Greetings
  // ==========================================================================
  it('triggers autonomous greetings when NPCs and players share a venue during social hours', async () => {
    // Both Player and Mama Nkechi are at 'venue-mama-put'
    // Simulate social hour at 19:00 UTC
    const socialTime = new Date('2026-10-11T19:00:00Z');
    const tickResult = await NpcService.simulateTick({ gameTime: socialTime }, mockDb);

    const greetActions = tickResult.actionsExecuted.filter((a) => a.actionType === 'greeted_character');
    expect(greetActions.length).toBeGreaterThan(0);

    const greetAction = greetActions.find((a) => a.characterId === CANONICAL_NPC_IDS.MAMA_NKECHI);
    expect(greetAction).toBeDefined();
    expect(greetAction?.details.targetCharacterId).toBe('char-player-emeka');

    // Verify relationship was updated
    const relKey = `${CANONICAL_NPC_IDS.MAMA_NKECHI}:char-player-emeka:acquaintance`;
    expect(mockRelationships.has(relKey)).toBe(true);
  });

  // ==========================================================================
  // Test 7: Full 24-Hour Neighbourhood Simulation Cycle
  // ==========================================================================
  it('runs a continuous 24-hour cycle maintaining state continuity, events, and economic coherence', async () => {
    const startHour = 0;
    const baseDate = new Date('2026-10-12T00:00:00Z');

    let totalActionsCount = 0;

    for (let h = startHour; h < 24; h++) {
      const stepTime = new Date(baseDate.getTime() + h * 3600 * 1000);
      const res = await NpcService.simulateTick({ gameTime: stepTime }, mockDb);
      totalActionsCount += res.actionsExecuted.length;
    }

    expect(totalActionsCount).toBeGreaterThan(10);
    expect(mockEvents.length).toBeGreaterThan(0);

    // Check that all 3 NPCs remain in valid and alive states
    for (const npcId of Object.values(CANONICAL_NPC_IDS)) {
      const state = await NpcService.getNpcState(npcId, mockDb);
      expect(state).not.toBeNull();
      expect(state?.energy).toBeGreaterThanOrEqual(0);
      expect(state?.health).toBeGreaterThanOrEqual(90);
      expect(state?.walletBalance).toBeGreaterThan(0);
    }
  });
});
