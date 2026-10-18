import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { executeCommand } from '@/lib/commands';
import { Commands } from '@/lib/types/command-types';
import { checkRateLimit, resetRateLimits } from '@/lib/security/rateLimiter';
import { toSafeUuid, isValidUuid } from '@/lib/utils/uuid';
import { CANONICAL_JOB_OFFERINGS } from '@/lib/commands/definitions/economy';

// Mock DB factory
function createMockDb(initialData: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {
    acct_account: [
      { id: 'acct-1', user_id: 'user-1', status: 'active' },
    ],
    acct_active_character: [
      {
        account_id: 'acct-1',
        character_id: 'char-1',
        acct_account: { user_id: 'user-1', status: 'active' },
      },
    ],
    chr_character: [
      { id: 'char-1', account_id: 'acct-1', display_name: 'Audit Actor' },
      { id: 'char-2', account_id: 'acct-2', display_name: 'Target Citizen' },
    ],
    eco_wallet: [
      { character_id: 'char-1', balance: 5000, currency: 'NGN' },
      { character_id: 'char-2', balance: 1000, currency: 'NGN' },
    ],
    eco_employment: [],
    eco_work_session: [],
    eco_transaction: [],
    cmd_idempotency: [],
    obs_command_log: [],
    evt_event: [],
    evt_effect: [],
    ...initialData,
  };

  return {
    from: (tableName: string) => {
      const tableData = tables[tableName] || [];
      let filters: Array<(row: any) => boolean> = [];
      let isHead = false;

      const builder: any = {
        select: (cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) isHead = true;
          return builder;
        },
        eq: (col: string, val: any) => {
          filters.push((row) => {
            if (col.includes('.')) {
              const parts = col.split('.');
              let cur = row;
              for (const p of parts) {
                cur = cur?.[p];
              }
              return cur === val;
            }
            return row[col] === val;
          });
          return builder;
        },
        gte: (col: string, val: any) => {
          filters.push((row) => row[col] >= val);
          return builder;
        },
        contains: (col: string, val: Record<string, any>) => {
          filters.push((row) => {
            const rowVal = row[col] || {};
            return Object.keys(val).every((k) => rowVal[k] === val[k]);
          });
          return builder;
        },
        update: (updates: any) => {
          return {
            eq: (col: string, val: any) => {
              for (let i = 0; i < tableData.length; i++) {
                if (tableData[i][col] === val) {
                  tableData[i] = { ...tableData[i], ...updates };
                }
              }
              return { error: null };
            },
          };
        },
        insert: (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          tableData.push(...rows);
          return {
            select: () => ({
              maybeSingle: async () => ({ data: rows[0], error: null }),
            }),
          };
        },
        upsert: (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          for (const r of rows) {
            const idx = tableData.findIndex((existing) => existing.id === r.id || existing.character_id === r.character_id || existing.account_id === r.account_id);
            if (idx >= 0) tableData[idx] = { ...tableData[idx], ...r };
            else tableData.push(r);
          }
          return {
            select: () => ({
              maybeSingle: async () => ({ data: rows[0], error: null }),
            }),
          };
        },
        maybeSingle: async () => {
          const filtered = tableData.filter((row) => filters.every((f) => f(row)));
          return { data: filtered[0] || null, error: null };
        },
        single: async () => {
          const filtered = tableData.filter((row) => filters.every((f) => f(row)));
          return { data: filtered[0] || null, error: filtered.length === 0 ? new Error('Not found') : null };
        },
        then: (resolve: any) => {
          const filtered = tableData.filter((row) => filters.every((f) => f(row)));
          if (isHead) {
            return Promise.resolve({ count: filtered.length, error: null }).then(resolve);
          }
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        },
      };

      return builder;
    },
  };
}

describe('Security & Engineering Audit Regression Test Suite', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe('1. UUID Normalization & Validation', () => {
    it('validates RFC 4122 standard UUIDs', () => {
      const valid = '10000000-0000-0000-0000-000000000023';
      expect(isValidUuid(valid)).toBe(true);
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid(12345)).toBe(false);
    });

    it('safely normalizes arbitrary strings into deterministic valid UUIDs', () => {
      const arbitraryKey = 'buy-item-bread-12345';
      const normalized = toSafeUuid(arbitraryKey);

      expect(isValidUuid(normalized)).toBe(true);
      // Determinism: Same input must yield identical UUID
      expect(toSafeUuid(arbitraryKey)).toBe(normalized);
      // Different input must yield different UUID
      expect(toSafeUuid('buy-item-fish-999')).not.toBe(normalized);
    });
  });

  describe('2. Rate Limiting Protection', () => {
    it('allows requests within the bucket limit and blocks excess requests with 429', () => {
      const testActor = 'user-spam-test';

      // 5 requests within limit of 5
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(testActor, { limit: 5, windowMs: 5000 });
        expect(res.allowed).toBe(true);
      }

      // 6th request must be rejected
      const blocked = checkRateLimit(testActor, { limit: 5, windowMs: 5000 });
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetInMs).toBeGreaterThan(0);
    });
  });

  describe('3. Economy Exploit Mitigations', () => {
    it('rejects unauthorized or inflated hourly wages in ACCEPT_JOB', async () => {
      const db = createMockDb();
      const ctx = { db: db as any, actorId: 'user-1', characterId: 'char-1' };

      // Attempting to accept Plaza job with unauthorized rate (e.g. 50,000 NGN instead of 800)
      const exploitResult = await executeCommand(
        {
          type: Commands.ACCEPT_JOB,
          payload: {
            employerId: '10000000-0000-0000-0000-000000000023',
            employerType: 'business',
            jobTitle: 'Plaza Logistics Assistant',
            hourlyRate: 50000,
          },
          idempotency_key: crypto.randomUUID(),
          actor_id: 'user-1',
          issued_at: new Date().toISOString(),
        },
        ctx
      );

      expect(exploitResult.ok).toBe(false);
      expect(exploitResult.reason).toContain('Hourly rate exceeds maximum allowable rate');

      // Canonical rate passes
      const legitResult = await executeCommand(
        {
          type: Commands.ACCEPT_JOB,
          payload: {
            employerId: '10000000-0000-0000-0000-000000000023',
            employerType: 'business',
            jobTitle: 'Plaza Logistics Assistant',
            hourlyRate: CANONICAL_JOB_OFFERINGS['10000000-0000-0000-0000-000000000023'].hourlyRate,
          },
          idempotency_key: crypto.randomUUID(),
          actor_id: 'user-1',
          issued_at: new Date().toISOString(),
        },
        ctx
      );

      expect(legitResult.ok).toBe(true);
    });

    it('rejects invalid, NaN, Infinity, negative, and fractional transfer amounts in TRANSFER_MONEY', async () => {
      const db = createMockDb();
      const ctx = { db: db as any, actorId: 'user-1', characterId: 'char-1' };

      const testCases = [
        { amount: NaN, desc: 'NaN' },
        { amount: Infinity, desc: 'Infinity' },
        { amount: -500, desc: 'negative amount' },
        { amount: 0, desc: 'zero amount' },
        { amount: 15.75, desc: 'fractional Naira amount' },
      ];

      for (const tc of testCases) {
        const result = await executeCommand(
          {
            type: Commands.TRANSFER_MONEY,
            payload: {
              targetCharacterId: 'char-2',
              amount: tc.amount,
            },
            idempotency_key: crypto.randomUUID(),
            actor_id: 'user-1',
            issued_at: new Date().toISOString(),
          },
          ctx
        );

        expect(result.ok).toBe(false);
      }
    });

    it('rejects unilateral un-priced venue or real-estate takeover in ACQUIRE_ASSET', async () => {
      const db = createMockDb();
      const ctx = { db: db as any, actorId: 'user-1', characterId: 'char-1' };

      const exploitResult = await executeCommand(
        {
          type: Commands.ACQUIRE_ASSET,
          payload: {
            assetType: 'venue',
            assetId: '10000000-0000-0000-0000-000000000021', // Mama Tarila Bole Joint
            sharePercentage: 100,
          },
          idempotency_key: crypto.randomUUID(),
          actor_id: 'user-1',
          issued_at: new Date().toISOString(),
        },
        ctx
      );

      expect(exploitResult.ok).toBe(false);
      expect(exploitResult.reason).toContain('Direct asset seizure rejected');
    });
  });

  describe('4. Sybil Mitigation & Character Caps', () => {
    it('enforces maximum 5 characters per account', async () => {
      // Setup account with already 5 characters
      const existingChars = [
        { id: 'c-1', account_id: 'acct-max', display_name: 'C1' },
        { id: 'c-2', account_id: 'acct-max', display_name: 'C2' },
        { id: 'c-3', account_id: 'acct-max', display_name: 'C3' },
        { id: 'c-4', account_id: 'acct-max', display_name: 'C4' },
        { id: 'c-5', account_id: 'acct-max', display_name: 'C5' },
      ];

      const db = createMockDb({
        acct_account: [{ id: 'acct-max', user_id: 'user-max', status: 'active' }],
        chr_character: existingChars,
      });

      const ctx = { db: db as any, actorId: 'user-max' };

      const result = await executeCommand(
        {
          type: Commands.CREATE_CHARACTER,
          payload: {
            displayName: 'Illegal 6th Character',
          },
          idempotency_key: crypto.randomUUID(),
          actor_id: 'user-max',
          issued_at: new Date().toISOString(),
        },
        ctx
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Maximum character limit reached');
    });
  });

  describe('5. Social Cooldowns & Anti-Spam', () => {
    it('enforces greeting cooldown preventing rapid popularity inflation', async () => {
      const recentEvent = {
        id: 'evt-recent-greet',
        type: 'CHARACTER_GREETED',
        actor_id: 'char-1',
        created_at: new Date().toISOString(),
        payload: { target_character_id: 'char-2' },
      };

      const db = createMockDb({
        evt_event: [recentEvent],
      });

      const ctx = { db: db as any, actorId: 'user-1', characterId: 'char-1' };

      const spamResult = await executeCommand(
        {
          type: Commands.GREET_CHARACTER,
          payload: {
            targetCharacterId: 'char-2',
          },
          idempotency_key: crypto.randomUUID(),
          actor_id: 'user-1',
          issued_at: new Date().toISOString(),
        },
        ctx
      );

      expect(spamResult.ok).toBe(false);
      expect(spamResult.reason).toContain('Greeting cooldown active');
    });
  });

  describe('6. Idempotent Replay Handling', () => {
    it('normalizes arbitrary idempotency key strings and prevents duplicate mutations', async () => {
      const db = createMockDb();
      const ctx = { db: db as any, actorId: 'user-1', characterId: 'char-1' };

      const command = {
        type: Commands.TRANSFER_MONEY,
        payload: {
          targetCharacterId: 'char-2',
          amount: 500,
        },
        idempotency_key: 'custom-client-key-transfer-001',
        actor_id: 'user-1',
        issued_at: new Date().toISOString(),
      };

      // First execution
      const res1 = await executeCommand(command, ctx);
      expect(res1.ok).toBe(true);

      // Second execution with same idempotency key
      const res2 = await executeCommand(command, ctx);
      expect(res2.ok).toBe(true);
      expect(res2.idempotent_replay).toBe(true);
    });
  });
});
