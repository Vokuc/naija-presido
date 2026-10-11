import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommandPipeline } from '../lib/commands/pipeline';
import { defineCommand, registerCommand } from '../lib/commands/registry';
import { Commands, Command } from '../lib/types/command-types';
import { CommandExecutionContext } from '../lib/commands/types';
import { EconomyService } from '../domains/economy/service';
import {
  AcceptJobCommand,
  StartWorkCommand,
  EndWorkCommand,
  BuyItemCommand,
  TransferMoneyCommand,
  AcquireAssetCommand,
} from '../lib/commands/definitions/economy';

describe('Playable Economy Foundation & Loop', () => {
  let mockDb: Record<string, any>;
  let mockWallets: Map<string, any>;
  let mockTransactions: any[];
  let mockEmployments: Map<string, any>;
  let mockWorkSessions: Map<string, any>;
  let mockAssets: Map<string, any>;
  let mockOwnerships: Map<string, any>;
  let mockEvents: any[];
  let mockEffects: any[];

  beforeEach(() => {
    mockWallets = new Map();
    mockTransactions = [];
    mockEmployments = new Map();
    mockWorkSessions = new Map();
    mockAssets = new Map();
    mockOwnerships = new Map();
    mockEvents = [];
    mockEffects = [];

    // Seed initial characters
    mockWallets.set('char-emeka-01', {
      id: 'wal-emeka',
      character_id: 'char-emeka-01',
      owner_type: 'character',
      balance: 1000,
      currency: 'NGN',
      updated_at: new Date().toISOString(),
    });

    mockWallets.set('char-chidi-02', {
      id: 'wal-chidi',
      character_id: 'char-chidi-02',
      owner_type: 'character',
      balance: 500,
      currency: 'NGN',
      updated_at: new Date().toISOString(),
    });

    // Seed business employer wallet (polymorphic employer!)
    mockWallets.set('biz-bukka-lagos', {
      id: 'wal-bukka',
      character_id: 'biz-bukka-lagos',
      owner_type: 'business',
      balance: 500000,
      currency: 'NGN',
      updated_at: new Date().toISOString(),
    });

    mockDb = {
      from: vi.fn((table: string) => {
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
            insert: vi.fn((record: any) => {
              mockWallets.set(record.character_id, {
                id: `wal-${record.character_id}`,
                ...record,
              });
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: mockWallets.get(record.character_id),
                    error: null,
                  }),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: string) => {
                const existing = mockWallets.get(val) ?? { character_id: val, balance: 0 };
                mockWallets.set(val, { ...existing, ...updates });
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'eco_transaction') {
          return {
            insert: vi.fn((records: any) => {
              const rows = Array.isArray(records) ? records : [records];
              const created = rows.map((r, idx) => ({
                id: `txn-${mockTransactions.length + idx + 1}`,
                created_at: new Date().toISOString(),
                ...r,
              }));
              mockTransactions.push(...created);
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
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const match = mockTransactions.find((t) => t[col] === val);
                  return { data: match ?? null, error: null };
                }),
              })),
              order: vi.fn(() => ({
                limit: vi.fn((lim: number) => ({
                  data: mockTransactions.slice(0, lim),
                  error: null,
                })),
                then: (resolve: any) => resolve({ data: mockTransactions, error: null }),
              })),
            })),
          };
        }

        if (table === 'eco_employment') {
          return {
            insert: vi.fn((record: any) => {
              const id = `emp-${mockEmployments.size + 1}`;
              const created = { id, ...record };
              mockEmployments.set(id, created);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: created,
                    error: null,
                  }),
                })),
              };
            }),
            select: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: any) => ({
                eq: vi.fn((col2: string, val2: any) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    for (const emp of mockEmployments.values()) {
                      if (emp[col1] === val1 && emp[col2] === val2) {
                        return { data: emp, error: null };
                      }
                    }
                    return { data: null, error: null };
                  }),
                })),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  for (const emp of mockEmployments.values()) {
                    if (emp[col1] === val1) {
                      return { data: emp, error: null };
                    }
                  }
                  return { data: null, error: null };
                }),
              })),
            })),
          };
        }

        if (table === 'eco_work_session') {
          return {
            insert: vi.fn((record: any) => {
              const id = `ws-${mockWorkSessions.size + 1}`;
              const created = { id, ...record };
              mockWorkSessions.set(id, created);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: created,
                    error: null,
                  }),
                })),
              };
            }),
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                is: vi.fn((colNull: string, valNull: any) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    for (const s of mockWorkSessions.values()) {
                      if (s[col] === val && s[colNull] === null) {
                        return { data: s, error: null };
                      }
                    }
                    return { data: null, error: null };
                  }),
                })),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const s = mockWorkSessions.get(val);
                  return { data: s ?? null, error: null };
                }),
              })),
            })),
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

        if (table === 'eco_asset') {
          return {
            insert: vi.fn((record: any) => {
              const id = `ast-${mockAssets.size + 1}`;
              const created = { id, ...record };
              mockAssets.set(id, created);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: created, error: null }),
                })),
              };
            }),
            select: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: any) => ({
                eq: vi.fn((col2: string, val2: any) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    for (const a of mockAssets.values()) {
                      if (a[col1] === val1 && a[col2] === val2) {
                        return { data: a, error: null };
                      }
                    }
                    return { data: null, error: null };
                  }),
                })),
              })),
            })),
          };
        }

        if (table === 'eco_asset_ownership') {
          return {
            insert: vi.fn((record: any) => {
              const id = `own-${mockOwnerships.size + 1}`;
              const created = { id, ...record };
              mockOwnerships.set(id, created);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: created, error: null }),
                })),
              };
            }),
            select: vi.fn(() => ({
              eq: vi.fn((col1: string, val1: any) => ({
                eq: vi.fn((col2: string, val2: any) => ({
                  then: (resolve: any) => {
                    const list = Array.from(mockOwnerships.values()).filter(
                      (o) => o[col1] === val1 && o[col2] === val2
                    );
                    resolve({ data: list, error: null });
                  },
                })),
              })),
            })),
          };
        }

        if (table === 'eco_item_catalog') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  if (val === 'Jollof Rice & Chicken') {
                    return {
                      data: {
                        id: 'item-jollof',
                        name: 'Jollof Rice & Chicken',
                        category: 'food',
                        price: 1500,
                        energy_delta: 30,
                        hunger_delta: -50,
                        is_durable: false,
                      },
                      error: null,
                    };
                  }
                  if (val === 'Work Boots') {
                    return {
                      data: {
                        id: 'item-boots',
                        name: 'Work Boots',
                        category: 'tool',
                        price: 4500,
                        energy_delta: 0,
                        hunger_delta: 0,
                        is_durable: true,
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: null };
                }),
              })),
            })),
          };
        }

        if (table === 'evt_event') {
          return {
            insert: vi.fn((record: any) => {
              mockEvents.push(record);
              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: `evt-${mockEvents.length}` },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }

        if (table === 'evt_effect') {
          return {
            insert: vi.fn((records: any) => {
              const rows = Array.isArray(records) ? records : [records];
              mockEffects.push(...rows);
              return { error: null };
            }),
          };
        }

        if (table === 'acct_active_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    character_id: 'char-emeka-01',
                    acct_account: { user_id: 'user-auth-emeka', status: 'active' },
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
              eq: vi.fn((col: string, val: string) => ({
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
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  });

  const getCtx = (charId = 'char-emeka-01', gameTime = new Date('2026-10-11T08:00:00Z')): CommandExecutionContext => ({
    db: mockDb as any,
    actorId: 'user-auth-emeka',
    characterId: charId,
    gameTime,
  });

  describe('First Playable Economy Loop', () => {
    it('executes full loop: obtains job -> performs work -> earns money -> spends money -> records history', async () => {
      const charId = 'char-emeka-01';
      let ctx = getCtx(charId, new Date('2026-10-11T08:00:00Z'));

      // 1. OBTAINS JOB (Employment) with a business employer
      const acceptJobCmd: Command<any> = {
        type: Commands.ACCEPT_JOB,
        payload: {
          employerId: 'biz-bukka-lagos',
          employerType: 'business', // Business is employer, not just character!
          jobTitle: 'Cook & Store Assistant',
          hourlyRate: 1000,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440001',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const jobResult = await executeCommandPipeline(acceptJobCmd, AcceptJobCommand, ctx);
      expect(jobResult.ok).toBe(true);
      expect(jobResult.state!.jobTitle).toBe('Cook & Store Assistant');
      expect(jobResult.state!.hourlyRate).toBe(1000);
      expect(jobResult.state!.employerType).toBe('business');
      const employmentId = jobResult.state!.id;

      // 2. PERFORMS WORK (Start shift at 08:00 game time)
      const startWorkCmd: Command<any> = {
        type: Commands.START_WORK,
        payload: { employmentId },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440002',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const startResult = await executeCommandPipeline(startWorkCmd, StartWorkCommand, ctx);
      expect(startResult.ok).toBe(true);
      const workSessionId = startResult.state!.id;

      // 3. EARNS MONEY (End shift after 4 game hours at 12:00 game time)
      ctx = getCtx(charId, new Date('2026-10-11T12:00:00Z'));
      const endWorkCmd: Command<any> = {
        type: Commands.END_WORK,
        payload: { workSessionId },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440003',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const endResult = await executeCommandPipeline(endWorkCmd, EndWorkCommand, ctx);
      expect(endResult.ok).toBe(true);
      expect(endResult.state!.hoursWorked).toBe(4);
      expect(endResult.state!.earned).toBe(4000); // 4 hours * 1000 NGN/hr
      // Starting balance was 1000 NGN + 4000 NGN wage = 5000 NGN
      expect(endResult.state!.newBalance).toBe(5000);
      expect(mockWallets.get(charId).balance).toBe(5000);

      // 4. SPENDS MONEY (Buys Jollof Rice & Chicken for 1500 NGN)
      const buyItemCmd: Command<any> = {
        type: Commands.BUY_ITEM,
        payload: {
          itemName: 'Jollof Rice & Chicken',
          sellerId: 'biz-bukka-lagos',
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440004',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const buyResult = await executeCommandPipeline(buyItemCmd, BuyItemCommand, ctx);
      expect(buyResult.ok).toBe(true);
      expect(buyResult.state!.price).toBe(1500);
      // 5000 NGN - 1500 NGN = 3500 NGN
      expect(buyResult.state!.newBalance).toBe(3500);
      expect(mockWallets.get(charId).balance).toBe(3500);

      // 5. TRANSACTION HISTORY RECORDS THE RESULT
      const history = await EconomyService.getTransactionHistory(charId, mockDb);
      expect(history.length).toBe(2);

      const purchaseTxn = history.find((t) => t.sourceType === 'purchase');
      expect(purchaseTxn).toBeDefined();
      expect(purchaseTxn!.fromId).toBe(charId);
      expect(purchaseTxn!.toId).toBe('biz-bukka-lagos');
      expect(purchaseTxn!.amount).toBe(1500);

      const wageTxn = history.find((t) => t.sourceType === 'employment');
      expect(wageTxn).toBeDefined();
      expect(wageTxn!.fromId).toBe('biz-bukka-lagos');
      expect(wageTxn!.toId).toBe(charId);
      expect(wageTxn!.amount).toBe(4000);
    });
  });

  describe('Balance Integrity & Security', () => {
    it('rejects direct client attempts to mutate wallet balances', async () => {
      const maliciousCmd: Command<any> = {
        type: Commands.BUY_ITEM,
        payload: {
          itemName: 'Jollof Rice & Chicken',
          wallet_balance: 99999999, // Forged balance attempt
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440005',
        character_id: 'char-emeka-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(maliciousCmd, BuyItemCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.reason).toContain('Direct state mutation rejected');
      expect(result.reason).toContain('wallet_balance');
    });

    it('rejects purchases and transfers when wallet has insufficient funds', async () => {
      // char-emeka-01 balance is 1000 NGN. Attempt to transfer 5000 NGN.
      const transferCmd: Command<any> = {
        type: Commands.TRANSFER_MONEY,
        payload: {
          targetCharacterId: 'char-chidi-02',
          amount: 5000,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440006',
        character_id: 'char-emeka-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(transferCmd, TransferMoneyCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.reason).toContain('Insufficient funds');

      // Balances must remain unchanged
      expect(mockWallets.get('char-emeka-01').balance).toBe(1000);
      expect(mockWallets.get('char-chidi-02').balance).toBe(500);
    });

    it('rejects self-transfer of money', async () => {
      const selfCmd: Command<any> = {
        type: Commands.TRANSFER_MONEY,
        payload: {
          targetCharacterId: 'char-emeka-01', // self
          amount: 100,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440007',
        character_id: 'char-emeka-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(selfCmd, TransferMoneyCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Cannot transfer money to yourself');
    });

    it('rejects invalid transfer amounts <= 0', async () => {
      const invalidCmd: Command<any> = {
        type: Commands.TRANSFER_MONEY,
        payload: {
          targetCharacterId: 'char-chidi-02',
          amount: -50,
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440008',
        character_id: 'char-emeka-01',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(invalidCmd, TransferMoneyCommand, getCtx());
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('strictly greater than 0');
    });
  });

  describe('Duplicate Commands & Idempotency', () => {
    it('handles idempotent replay of duplicate transfer commands safely', async () => {
      const idempKey = '550e8400-e29b-41d4-a716-446655440099';

      // 1. Initial successful transfer of 200 NGN
      const transferRes = await EconomyService.transferFunds(
        {
          fromId: 'char-emeka-01',
          toId: 'char-chidi-02',
          amount: 200,
          sourceType: 'transfer',
          reason: 'Gift',
          idempotencyKey: idempKey,
          gameTimestamp: new Date().toISOString(),
        },
        mockDb
      );

      expect(transferRes.status).toBe('success');
      expect(mockWallets.get('char-emeka-01').balance).toBe(800);
      expect(mockWallets.get('char-chidi-02').balance).toBe(700);

      // 2. Duplicate transfer with the same idempotency key
      const duplicateRes = await EconomyService.transferFunds(
        {
          fromId: 'char-emeka-01',
          toId: 'char-chidi-02',
          amount: 200,
          sourceType: 'transfer',
          reason: 'Gift',
          idempotencyKey: idempKey,
          gameTimestamp: new Date().toISOString(),
        },
        mockDb
      );

      expect(duplicateRes.status).toBe('idempotent_replay');
      // Balance must NOT be deducted twice!
      expect(mockWallets.get('char-emeka-01').balance).toBe(800);
      expect(mockWallets.get('char-chidi-02').balance).toBe(700);
    });
  });

  describe('Asset Foundation & Ownership Separation', () => {
    it('creates asset separately from character and assigns ownership independently', async () => {
      const charId = 'char-emeka-01';

      // 1. Buy durable item (Work Boots)
      const buyBootsCmd: Command<any> = {
        type: Commands.BUY_ITEM,
        payload: {
          itemName: 'Work Boots', // price: 4500, isDurable: true
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440010',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      // Top up Emeka's wallet to afford boots
      mockWallets.set(charId, { ...mockWallets.get(charId), balance: 10000 });

      const result = await executeCommandPipeline(buyBootsCmd, BuyItemCommand, getCtx(charId));
      expect(result.ok).toBe(true);
      expect(result.state!.assetId).toBeDefined();

      // Verify asset exists in eco_asset
      const asset = mockAssets.get(result.state!.assetId!);
      expect(asset).toBeDefined();
      expect(asset.asset_type).toBe('item');

      // Verify ownership exists in eco_asset_ownership (separate from character and separate from asset)
      const ownerships = await EconomyService.getAssetOwnerships(charId, mockDb);
      expect(ownerships.length).toBe(1);
      expect(ownerships[0].assetId).toBe(result.state!.assetId);
      expect(ownerships[0].ownerType).toBe('character');
      expect(ownerships[0].ownerId).toBe(charId);
      expect(ownerships[0].sharePercentage).toBe(100);
    });

    it('supports direct ACQUIRE_ASSET command for business or real estate ownership', async () => {
      const charId = 'char-emeka-01';
      const acquireCmd: Command<any> = {
        type: Commands.ACQUIRE_ASSET,
        payload: {
          assetType: 'venue',
          assetId: 'venue-tejuosho-stall-01',
          sharePercentage: 50, // Co-ownership support!
        },
        idempotency_key: '550e8400-e29b-41d4-a716-446655440011',
        character_id: charId,
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(acquireCmd, AcquireAssetCommand, getCtx(charId));
      expect(result.ok).toBe(true);
      expect(result.state!.sharePercentage).toBe(50);
      expect(result.state!.ownershipId).toBeDefined();

      const ownerships = await EconomyService.getAssetOwnerships(charId, mockDb);
      expect(ownerships.some((o) => o.sharePercentage === 50)).toBe(true);
    });
  });
});
