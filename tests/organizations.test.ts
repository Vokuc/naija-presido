import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommandPipeline } from '../lib/commands/pipeline';
import { Commands } from '../lib/types/command-types';
import { CommandExecutionContext } from '../lib/commands/types';
import { OrganizationService } from '../domains/organizations/service';
import {
  CreateOrganizationCommand,
  JoinOrganizationCommand,
  LeaveOrganizationCommand,
  PayOrgDuesCommand,
  AssignOrgRoleCommand,
} from '../lib/commands/definitions/organization';
import { BuyItemCommand } from '../lib/commands/definitions/economy';

describe('Stage 1: Organizations, Businesses & Enterprise Substrate', () => {
  let mockDb: Record<string, any>;
  let mockOrgs: Map<string, any>;
  let mockRoles: Map<string, any>;
  let mockMembers: Map<string, any>;
  let mockWallets: Map<string, any>;
  let mockTransactions: any[];
  let mockEvents: any[];
  let mockItems: Map<string, any>;

  beforeEach(() => {
    mockOrgs = new Map();
    mockRoles = new Map();
    mockMembers = new Map();
    mockWallets = new Map();
    mockTransactions = [];
    mockEvents = [];
    mockItems = new Map();

    // Seed canonical Bole item
    mockItems.set('Bole & Fish Special', {
      id: 'item-bole-01',
      name: 'Bole & Fish Special',
      description: 'Roasted plantain with spiced fish',
      price: 1500,
      isDurable: false,
      energyDelta: 35,
      hungerDelta: -45,
    });

    // Seed Mama Tarila Bole Enterprises
    const boleOrgId = '20000000-0000-0000-0000-000000000001';
    mockOrgs.set(boleOrgId, {
      id: boleOrgId,
      name: 'Mama Tarila Bole Enterprises',
      slug: 'mama-tarila-bole',
      type: 'business',
      description: 'Port Harcourt Bole enterprise',
      founder_id: 'char-tarila-01',
      venue_id: '10000000-0000-0000-0000-000000000021',
      status: 'active',
    });

    // Seed D-Line Transport & Keke Drivers Union
    const unionOrgId = '20000000-0000-0000-0000-000000000003';
    mockOrgs.set(unionOrgId, {
      id: unionOrgId,
      name: 'D-Line Transport & Keke Drivers Union',
      slug: 'dline-keke-union',
      type: 'trade_union',
      description: 'Keke drivers union',
      founder_id: 'char-tamuno-01',
      venue_id: '10000000-0000-0000-0000-000000000022',
      status: 'active',
    });

    // Seed Union Roles
    const leaderRoleId = 'role-union-chairman';
    const memberRoleId = 'role-union-driver';
    mockRoles.set(leaderRoleId, {
      id: leaderRoleId,
      org_id: unionOrgId,
      name: 'Unit Chairman',
      rank: 100,
      permissions: { can_hire: true, can_expel: true, can_withdraw: true, can_set_dues: true },
      base_salary: 1500,
    });
    mockRoles.set(memberRoleId, {
      id: memberRoleId,
      org_id: unionOrgId,
      name: 'Registered Driver Member',
      rank: 10,
      permissions: { can_hire: false, can_expel: false, can_withdraw: false, can_set_dues: false },
      base_salary: 0,
    });

    // Seed Elder Tamuno as Chairman
    mockMembers.set(`${unionOrgId}:char-tamuno-01`, {
      id: 'mem-tamuno-01',
      org_id: unionOrgId,
      character_id: 'char-tamuno-01',
      role_id: leaderRoleId,
      status: 'active',
      reputation_in_org: 90,
      dues_paid_until: new Date(Date.now() + 86400000 * 30).toISOString(),
    });

    // Seed Wallets
    mockWallets.set('char-chidi-01', {
      id: 'wal-chidi',
      character_id: 'char-chidi-01',
      owner_type: 'character',
      balance: 10000,
      currency: 'NGN',
    });
    mockWallets.set(boleOrgId, {
      id: `wal-${boleOrgId}`,
      character_id: boleOrgId,
      owner_type: 'business',
      balance: 150000,
      currency: 'NGN',
    });
    mockWallets.set(unionOrgId, {
      id: `wal-${unionOrgId}`,
      character_id: unionOrgId,
      owner_type: 'organization',
      balance: 50000,
      currency: 'NGN',
    });

    // Build Mock Database
    mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'org_organization') {
          return {
            select: vi.fn(() => {
              const filters: Record<string, any> = {};
              const query: any = {
                eq: vi.fn((col: string, val: any) => {
                  filters[col] = val;
                  return query;
                }),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const items = Array.from(mockOrgs.values()).filter((o) => {
                    for (const [k, v] of Object.entries(filters)) {
                      if (o[k] !== v) return false;
                    }
                    return true;
                  });
                  return { data: items[0] ?? null, error: null };
                }),
              };
              return query;
            }),
            insert: vi.fn((record: any) => {
              mockOrgs.set(record.id, record);
              return { data: record, error: null };
            }),
          };
        }

        if (table === 'org_role') {
          return {
            select: vi.fn(() => {
              const filters: Record<string, any> = {};
              const query: any = {
                eq: vi.fn((col: string, val: any) => {
                  filters[col] = val;
                  return query;
                }),
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      const items = Array.from(mockRoles.values()).filter((r) => {
                        for (const [k, v] of Object.entries(filters)) {
                          if (r[k] !== v) return false;
                        }
                        return true;
                      });
                      return { data: items[0] ?? null, error: null };
                    }),
                  })),
                })),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const items = Array.from(mockRoles.values()).filter((r) => {
                    for (const [k, v] of Object.entries(filters)) {
                      if (r[k] !== v) return false;
                    }
                    return true;
                  });
                  return { data: items[0] ?? null, error: null };
                }),
              };
              return query;
            }),
            insert: vi.fn((records: any[]) => {
              const arr = Array.isArray(records) ? records : [records];
              for (const r of arr) mockRoles.set(r.id, r);
              return { data: records, error: null };
            }),
          };
        }

        if (table === 'org_member') {
          return {
            select: vi.fn(() => {
              const filters: Record<string, any> = {};
              const query: any = {
                eq: vi.fn((col: string, val: any) => {
                  filters[col] = val;
                  return query;
                }),
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const items = Array.from(mockMembers.values()).filter((m) => {
                    for (const [k, v] of Object.entries(filters)) {
                      if (m[k] !== v) return false;
                    }
                    return true;
                  });
                  const found = items[0] ?? null;
                  const roleData = found?.role_id ? mockRoles.get(found.role_id) : null;
                  return { data: found ? { ...found, org_role: roleData } : null, error: null };
                }),
                single: vi.fn().mockImplementation(async () => {
                  const items = Array.from(mockMembers.values()).filter((m) => {
                    for (const [k, v] of Object.entries(filters)) {
                      if (m[k] !== v) return false;
                    }
                    return true;
                  });
                  const found = items[0] ?? null;
                  const roleData = found?.role_id ? mockRoles.get(found.role_id) : null;
                  return { data: found ? { ...found, org_role: roleData } : null, error: null };
                }),
              };
              return query;
            }),
            insert: vi.fn((record: any) => {
              const id = record.id || `mem-${Date.now()}`;
              const key = `${record.org_id}:${record.character_id}`;
              const fullRecord = { ...record, id };
              mockMembers.set(key, fullRecord);
              return { data: fullRecord, error: null };
            }),
            update: vi.fn((updates: any) => {
              const filters: Record<string, any> = {};
              const query: any = {
                eq: vi.fn((col: string, val: any) => {
                  filters[col] = val;
                  for (const [k, existing] of mockMembers.entries()) {
                    let match = true;
                    for (const [fc, fv] of Object.entries(filters)) {
                      if (existing[fc] !== fv) match = false;
                    }
                    if (match) {
                      mockMembers.set(k, { ...existing, ...updates });
                    }
                  }
                  return query;
                }),
              };
              return query;
            }),
            delete: vi.fn(() => {
              const filters: Record<string, any> = {};
              const query: any = {
                eq: vi.fn((col: string, val: any) => {
                  filters[col] = val;
                  for (const [k, existing] of mockMembers.entries()) {
                    let match = true;
                    for (const [fc, fv] of Object.entries(filters)) {
                      if (existing[fc] !== fv) match = false;
                    }
                    if (match) {
                      mockMembers.delete(k);
                    }
                  }
                  return query;
                }),
              };
              return query;
            }),
          };
        }

        if (table === 'eco_wallet') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockWallets.get(val) ?? null,
                  error: null,
                }),
              })),
            })),
            upsert: vi.fn((record: any) => {
              mockWallets.set(record.character_id, record);
              return { error: null };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((col: string, val: any) => {
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
            })),
          };
        }

        if (table === 'eco_item_catalog') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: any) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockItems.get(val) ?? null,
                  error: null,
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
            insert: vi.fn(() => ({ error: null })),
          };
        }

        if (table === 'acct_active_character') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => {
                const charId = val === 'user-tamuno' ? 'char-tamuno-01' : 'char-chidi-01';
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      character_id: charId,
                      acct_account: { user_id: val, status: 'active' },
                    },
                    error: null,
                  }),
                };
              }),
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
            insert: vi.fn(() => ({ error: null })),
          };
        }

        if (table === 'chr_character_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { energy: 90, hunger: 20 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({ error: null })),
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
    };
  });

  it('1. Creates a new civic association and provisions treasury wallet', async () => {
    const ctx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-chidi',
      characterId: 'char-chidi-01',
    };

    const cmd = {
      type: Commands.CREATE_ORGANIZATION,
      payload: {
        name: 'Mile 1 Market Youth Union',
        type: 'trade_union' as const,
        description: 'Youth union regulating trade and welfare',
        initialDeposit: 2000,
      },
      idempotency_key: 'idemp-create-org-01',
      issued_at: new Date().toISOString(),
    };

    const result = await executeCommandPipeline(cmd as any, CreateOrganizationCommand, ctx);

    expect(result.ok).toBe(true);
    expect(result.state?.name).toBe('Mile 1 Market Youth Union');
    expect(result.state?.slug).toBe('mile-1-market-youth-union');

    // Founder should have paid ₦2,000 capitalization into org treasury
    const orgTreasury = mockWallets.get(result.state!.id);
    expect(orgTreasury).toBeDefined();
    expect(mockWallets.get('char-chidi-01').balance).toBe(8000); // 10000 - 2000
  });

  it('2. Enrolls a citizen as a member of an active union', async () => {
    const unionOrgId = '20000000-0000-0000-0000-000000000003';
    const ctx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-chidi',
      characterId: 'char-chidi-01',
    };

    const cmd = {
      type: Commands.JOIN_ORGANIZATION,
      payload: { orgId: unionOrgId },
      idempotency_key: 'idemp-join-org-01',
      issued_at: new Date().toISOString(),
    };

    const result = await executeCommandPipeline(cmd as any, JoinOrganizationCommand, ctx);

    expect(result.ok).toBe(true);
    expect(result.state?.orgId).toBe(unionOrgId);
    expect(result.state?.characterId).toBe('char-chidi-01');
    expect(result.state?.status).toBe('active');

    // Duplicate join should be authoritatively rejected
    const dupResult = await executeCommandPipeline(cmd as any, JoinOrganizationCommand, ctx);
    expect(dupResult.ok).toBe(false);
    expect(dupResult.reason).toContain('already an active member');
  });

  it('3. Pays union check-off dues into union treasury with validity extension', async () => {
    const unionOrgId = '20000000-0000-0000-0000-000000000003';
    // Enroll Chidi first
    mockMembers.set(`${unionOrgId}:char-chidi-01`, {
      id: 'mem-chidi-01',
      org_id: unionOrgId,
      character_id: 'char-chidi-01',
      role_id: 'role-union-driver',
      status: 'active',
      dues_paid_until: null,
    });

    const ctx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-chidi',
      characterId: 'char-chidi-01',
    };

    const cmd = {
      type: Commands.PAY_ORG_DUES,
      payload: { orgId: unionOrgId, amount: 500 },
      idempotency_key: 'idemp-dues-01',
      issued_at: new Date().toISOString(),
    };

    const result = await executeCommandPipeline(cmd as any, PayOrgDuesCommand, ctx);

    expect(result.ok).toBe(true);
    expect(result.state?.newBalance).toBe(9500); // 10000 - 500
    expect(result.state?.newOrgTreasury).toBe(50500); // 50000 + 500
    expect(result.state?.duesPaidUntil).toBeDefined();

    // Verify union wallet updated
    expect(mockWallets.get(unionOrgId).balance).toBe(50500);
    expect(mockWallets.get('char-chidi-01').balance).toBe(9500);

    // Verify dues_paid_until updated in member record
    const member = mockMembers.get(`${unionOrgId}:char-chidi-01`);
    expect(member.dues_paid_until).toBeDefined();
  });

  it('4. Rejects role promotion by unauthorized member and allows authorized chairman', async () => {
    const unionOrgId = '20000000-0000-0000-0000-000000000003';
    // Chidi is rank 10 driver without can_hire
    mockMembers.set(`${unionOrgId}:char-chidi-01`, {
      id: 'mem-chidi-01',
      org_id: unionOrgId,
      character_id: 'char-chidi-01',
      role_id: 'role-union-driver',
      status: 'active',
    });

    // Seed target member
    mockMembers.set(`${unionOrgId}:char-target-02`, {
      id: 'mem-target-02',
      org_id: unionOrgId,
      character_id: 'char-target-02',
      role_id: 'role-union-driver',
      status: 'active',
    });

    // 1. Chidi attempts to promote target to Unit Chairman (unauthorized)
    const unauthorizedCtx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-chidi',
      characterId: 'char-chidi-01',
    };

    const unauthorizedCmd = {
      type: Commands.ASSIGN_ORG_ROLE,
      payload: {
        orgId: unionOrgId,
        targetCharacterId: 'char-target-02',
        roleId: 'role-union-chairman',
      },
      idempotency_key: 'idemp-role-01',
      issued_at: new Date().toISOString(),
    };

    const failRes = await executeCommandPipeline(unauthorizedCmd as any, AssignOrgRoleCommand, unauthorizedCtx);
    expect(failRes.ok).toBe(false);
    expect(failRes.reason).toContain('Insufficient rank');

    // 2. Elder Tamuno (Chairman with can_hire: true) promotes target member
    const chairmanCtx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-tamuno',
      characterId: 'char-tamuno-01',
    };

    const chairmanCmd = {
      type: Commands.ASSIGN_ORG_ROLE,
      payload: {
        orgId: unionOrgId,
        targetCharacterId: 'char-target-02',
        roleId: 'role-union-chairman',
      },
      idempotency_key: 'idemp-role-02',
      issued_at: new Date().toISOString(),
    };

    const passRes = await executeCommandPipeline(chairmanCmd as any, AssignOrgRoleCommand, chairmanCtx);
    expect(passRes.ok).toBe(true);
    expect(passRes.state?.roleName).toBe('Unit Chairman');
    expect(passRes.state?.roleRank).toBe(100);
  });

  it('5. Closed-Loop Enterprise Economy: buying at Bole Joint deposits funds directly into Mama Tarila Bole Enterprises', async () => {
    const boleOrgId = '20000000-0000-0000-0000-000000000001';
    const boleVenueId = '10000000-0000-0000-0000-000000000021';

    const ctx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: 'user-chidi',
      characterId: 'char-chidi-01',
    };

    const buyCmd = {
      type: Commands.BUY_ITEM,
      payload: {
        itemName: 'Bole & Fish Special',
        venueId: boleVenueId, // At Mama Tarila Bole Joint without passing raw sellerId
      },
      idempotency_key: 'idemp-buy-bole-enterprise',
      issued_at: new Date().toISOString(),
    };

    const buyRes = await executeCommandPipeline(buyCmd as any, BuyItemCommand, ctx);

    expect(buyRes.ok).toBe(true);
    expect(buyRes.state?.price).toBe(1500);

    // Verify Chidi's wallet deducted 1,500
    expect(mockWallets.get('char-chidi-01').balance).toBe(8500); // 10000 - 1500

    // CRITICAL: Verify funds flowed directly into Mama Tarila Bole Enterprises wallet!
    const enterpriseWallet = mockWallets.get(boleOrgId);
    expect(enterpriseWallet.balance).toBe(151500); // 150000 + 1500!
  });
});
