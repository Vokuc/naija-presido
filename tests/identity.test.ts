import { describe, it, expect, vi } from 'vitest';
import { createAccountHandler } from '../src/server/commands/identity/create-account';
import { createCharacterHandler } from '../src/server/commands/identity/create-character';
import { Commands } from '../lib/types/command-types';
import { CommandContext } from '../lib/command-handler';

describe('Identity Lifecycle Commands', () => {
  it('should validate and create an account', async () => {
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    };

    const ctx: CommandContext = {
      db: mockDb,
      actorId: 'user-123'
    };

    const result = await createAccountHandler({
      type: Commands.CREATE_ACCOUNT,
      payload: { username: 'test_user' }
    }, ctx);

    expect(result.ok).toBe(true);
    expect(result.state).toEqual({ username: 'test_user' });
    
    // Verify it checked for existing user
    expect(mockDb.from).toHaveBeenCalledWith('acct_account');
    expect(mockDb.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      username: 'test_user',
      status: 'active'
    });
  });

  it('should reject invalid username', async () => {
    const result = await createAccountHandler({
      type: Commands.CREATE_ACCOUNT,
      payload: { username: 't' } // too short
    }, { db: {} as unknown as Record<string, unknown>, actorId: 'user-123' } as CommandContext);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Username must be between');
  });

  it('should reject unauthenticated character creation', async () => {
    const result = await createCharacterHandler({
      type: Commands.CREATE_CHARACTER,
      payload: { displayName: 'John Doe', isNpc: false }
    }, { db: {} as unknown as Record<string, unknown>, actorId: undefined } as unknown as CommandContext);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Authentication required to create a player character');
  });
  
  it('should allow character creation if authenticated', async () => {
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        // Return dummy account_id and character insert result
        return { data: { id: 'char-123' }, error: null };
      }),
      insert: vi.fn().mockReturnThis()
    };
    
    // Overriding single behavior based on context is complex in vi mock without state,
    // let's just assert the validation and basic simulation passing
    const ctx: CommandContext = {
      db: mockDb,
      actorId: 'user-123'
    };

    const result = await createCharacterHandler({
      type: Commands.CREATE_CHARACTER,
      payload: { displayName: 'John Doe' }
    }, ctx);

    expect(result.ok).toBe(true);
    expect(mockDb.from).toHaveBeenCalledWith('chr_character');
  });
});
