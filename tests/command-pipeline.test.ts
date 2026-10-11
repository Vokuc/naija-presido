import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommandPipeline } from '../lib/commands/pipeline';
import { defineCommand, registerCommand, executeCommand, getCommandDefinition } from '../lib/commands';
import { Commands, Command } from '../lib/types/command-types';
import { CommandDefinition, CommandExecutionContext } from '../lib/commands/types';

describe('Authoritative Command Pipeline & Architecture', () => {
  let mockDb: Record<string, any>;
  let mockContext: CommandExecutionContext;

  beforeEach(() => {
    mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      channel: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({}),
      }),
    };

    mockContext = {
      db: mockDb as any,
      actorId: 'user-auth-123',
    };
  });

  it('rejects direct client attempts to specify authoritative outcomes (e.g., money_balance)', async () => {
    const maliciousCommand: Command<{ targetAccount: string; money_balance: number }> = {
      type: Commands.TRANSFER_MONEY,
      payload: {
        targetAccount: 'account-999',
        money_balance: 100000000, // Attacker trying to set authoritative balance
      },
      idempotency_key: '550e8400-e29b-41d4-a716-446655440000',
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
    };

    const dummyDef: CommandDefinition = {
      type: Commands.TRANSFER_MONEY,
      validate: async () => true,
      simulate: async () => ({ state: { success: true } }),
    };

    const result = await executeCommandPipeline(maliciousCommand, dummyDef, mockContext);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.reason).toContain('Direct state mutation rejected');
    expect(result.reason).toContain('money_balance');

    // Observability audit log should record rejection
    expect(mockDb.from).toHaveBeenCalledWith('obs_command_log');
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        rejection_reason: expect.stringContaining('money_balance'),
      })
    );
  });

  it('rejects direct client attempts to specify reputation, political power, or npc outcome', async () => {
    const protectedAttempts = [
      { field: 'reputation', payload: { reputation: 100 } },
      { field: 'political_power', payload: { political_power: 500 } },
      { field: 'ownership', payload: { ownership: 'stolen_property' } },
      { field: 'npc_outcome', payload: { npc_outcome: 'obedient' } },
    ];

    const dummyDef: CommandDefinition = {
      type: Commands.TRANSFER_MONEY,
      validate: async () => true,
      simulate: async () => ({ state: {} }),
    };

    for (const attempt of protectedAttempts) {
      const cmd: Command<any> = {
        type: Commands.TRANSFER_MONEY,
        payload: attempt.payload,
        idempotency_key: '550e8400-e29b-41d4-a716-446655440001',
        character_id: 'char-123',
        issued_at: new Date().toISOString(),
      };

      const result = await executeCommandPipeline(cmd, dummyDef, mockContext);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.reason).toContain(attempt.field);
    }
  });

  it('enforces authentication when requiresAuth is true', async () => {
    const unauthenticatedCtx: CommandExecutionContext = {
      db: mockDb as any,
      actorId: undefined, // No user session
    };

    const cmd: Command<any> = {
      type: Commands.MOVE_CHARACTER,
      payload: { targetLocationId: 'loc-1' },
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
    };

    const dummyDef: CommandDefinition = {
      type: Commands.MOVE_CHARACTER,
      requiresAuth: true,
      validate: async () => true,
      simulate: async () => ({ state: {} }),
    };

    const result = await executeCommandPipeline(cmd, dummyDef, unauthenticatedCtx);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.reason).toContain('Authentication required');
  });

  it('enforces active character matching and authorization', async () => {
    // Mock user has character 'char-real', but client attempts to issue command for 'char-victim'
    mockDb.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        character_id: 'char-real',
        acct_account: { user_id: 'user-auth-123', status: 'active' },
      },
      error: null,
    });

    const spoofedCmd: Command<any> = {
      type: Commands.MOVE_CHARACTER,
      payload: { targetLocationId: 'loc-1' },
      character_id: 'char-victim', // Impersonation attack
      issued_at: new Date().toISOString(),
    };

    const dummyDef: CommandDefinition = {
      type: Commands.MOVE_CHARACTER,
      requiresAuth: true,
      requiresActiveCharacter: true,
      validate: async () => true,
      simulate: async () => ({ state: {} }),
    };

    const result = await executeCommandPipeline(spoofedCmd, dummyDef, mockContext);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.reason).toContain('character does not match active character');
  });

  it('rejects commands for suspended or banned accounts', async () => {
    mockDb.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        character_id: 'char-real',
        acct_account: { user_id: 'user-auth-123', status: 'suspended' },
      },
      error: null,
    });

    const cmd: Command<any> = {
      type: Commands.MOVE_CHARACTER,
      payload: { targetLocationId: 'loc-1' },
      character_id: 'char-real',
      issued_at: new Date().toISOString(),
    };

    const dummyDef: CommandDefinition = {
      type: Commands.MOVE_CHARACTER,
      requiresAuth: true,
      requiresActiveCharacter: true,
      validate: async () => true,
      simulate: async () => ({ state: {} }),
    };

    const result = await executeCommandPipeline(cmd, dummyDef, mockContext);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.reason).toContain('suspended');
  });

  it('requires an idempotency key for economic and state-changing commands', async () => {
    const cmdWithoutKey: Command<any> = {
      type: Commands.BUY_ITEM,
      payload: { itemId: 'item-xyz', quantity: 1 },
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
      // Missing idempotency_key
    };

    const dummyDef: CommandDefinition = {
      type: Commands.BUY_ITEM,
      validate: async () => true,
      simulate: async () => ({ state: {} }),
    };

    const result = await executeCommandPipeline(cmdWithoutKey, dummyDef, mockContext);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.reason).toContain('Idempotency key is required');
  });

  it('handles idempotency replay: returns cached result without re-executing simulation or state writes', async () => {
    const cachedState = { transaction_id: 'txn-cached-100', transferred: 5000 };

    // DB returns existing idempotency record
    mockDb.maybeSingle = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        data: { response_payload: cachedState },
        error: null,
      });
    });

    const simulateSpy = vi.fn();
    const cmd: Command<any> = {
      type: Commands.TRANSFER_MONEY,
      payload: { recipientId: 'char-456', amount: 5000 },
      idempotency_key: 'idemp-duplicate-uuid',
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
    };

    const dummyDef: CommandDefinition = {
      type: Commands.TRANSFER_MONEY,
      requiresAuth: false,
      requiresActiveCharacter: false,
      validate: async () => true,
      simulate: simulateSpy,
    };

    const result = await executeCommandPipeline(cmd, dummyDef, mockContext);

    expect(result.ok).toBe(true);
    expect(result.idempotent_replay).toBe(true);
    expect(result.state).toEqual(cachedState);
    // Simulation must NOT have been called again!
    expect(simulateSpy).not.toHaveBeenCalled();
  });

  it('executes full authoritative pipeline and persists domain events, effects, and state mutations', async () => {
    let callCount = 0;
    mockDb.maybeSingle = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Active character query
        return Promise.resolve({
          data: {
            character_id: 'char-123',
            acct_account: { user_id: 'user-auth-123', status: 'active' },
          },
          error: null,
        });
      }
      if (callCount === 2) {
        // Idempotency query (not found, new command)
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const mutateStateSpy = vi.fn().mockResolvedValue(undefined);

    const testCommandDef: CommandDefinition = {
      type: Commands.START_WORK,
      requiresAuth: true,
      requiresActiveCharacter: true,
      requiresIdempotency: true,
      authorize: async () => true,
      validate: async () => true,
      simulate: async (cmd, ctx) => {
        // Authoritative simulation determines what happens
        return {
          state: {
            session_id: 'sess-99',
            wages_earned: 1500, // Server calculated, not client passed
          },
          events: [
            {
              type: 'WORK_SESSION_STARTED',
              category: 'action',
              significance: 'minor',
              actor_id: ctx.characterId,
              payload: { shift: 'morning' },
              effects: [
                {
                  target_type: 'character',
                  target_id: ctx.characterId!,
                  attribute: 'energy',
                  delta: { change: -10 },
                },
              ],
            },
          ],
          notifications: [
            {
              character_id: ctx.characterId!,
              type: 'WORK_ALERT',
              title: 'Shift Started',
              body: 'You clocked in.',
            },
          ],
          realtimeBroadcasts: [
            {
              channel: 'venue:office-1',
              event: 'worker_clocked_in',
              payload: { worker: ctx.characterId },
            },
          ],
          stateMutations: mutateStateSpy,
        };
      },
    };

    const cmd: Command<any> = {
      type: Commands.START_WORK,
      payload: { workplaceVenueId: 'venue-1' },
      idempotency_key: '550e8400-e29b-41d4-a716-446655440010',
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
    };

    const result = await executeCommandPipeline(cmd, testCommandDef, mockContext);

    expect(result.ok).toBe(true);
    expect(result.state).toEqual({
      session_id: 'sess-99',
      wages_earned: 1500,
    });
    expect(result.events).toHaveLength(1);

    // 1. State mutation was executed
    expect(mutateStateSpy).toHaveBeenCalled();

    // 2. Domain event was persisted in evt_event
    expect(mockDb.from).toHaveBeenCalledWith('evt_event');
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WORK_SESSION_STARTED',
        category: 'action',
        actor_id: 'char-123',
      })
    );

    // 3. Domain effect was persisted in evt_effect
    expect(mockDb.from).toHaveBeenCalledWith('evt_effect');

    // 4. Notification was persisted in ntf_notification
    expect(mockDb.from).toHaveBeenCalledWith('ntf_notification');

    // 5. Idempotency record was saved in cmd_idempotency
    expect(mockDb.from).toHaveBeenCalledWith('cmd_idempotency');
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: '550e8400-e29b-41d4-a716-446655440010',
        command_type: Commands.START_WORK,
      })
    );

    // 6. Observability logged to obs_command_log
    expect(mockDb.from).toHaveBeenCalledWith('obs_command_log');
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        command_type: Commands.START_WORK,
        status: 'accepted',
      })
    );

    // 7. Realtime broadcast channel was dispatched
    expect(mockDb.channel).toHaveBeenCalledWith('venue:office-1');
  });

  it('works through registry dispatch via executeCommand', async () => {
    // Using registered MoveCharacterCommand through executeCommand
    mockDb.maybeSingle = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        data: {
          character_id: 'char-123',
          id: 'loc-island',
          location_id: 'loc-mainland',
          acct_account: { user_id: 'user-auth-123', status: 'active' },
        },
        error: null,
      });
    });

    const cmd: Command<any> = {
      type: Commands.MOVE_CHARACTER,
      payload: { targetLocationId: 'loc-island' },
      character_id: 'char-123',
      issued_at: new Date().toISOString(),
    };

    const result = await executeCommand(cmd, mockContext);

    expect(result.ok).toBe(true);
    expect(result.state).toEqual(
      expect.objectContaining({
        characterId: 'char-123',
        toLocationId: 'loc-island',
      })
    );
  });
});
