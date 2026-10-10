import { describe, it, expect, vi } from 'vitest';
import { changeLocationHandler } from '../src/server/commands/movement/change-location';
import { enterVenueHandler } from '../src/server/commands/movement/enter-venue';
import { leaveVenueHandler } from '../src/server/commands/movement/leave-venue';
import { Commands } from '../lib/types/command-types';
import { CommandContext } from '../lib/command-handler';

describe('Geography and Movement Commands', () => {
  it('should change persistent location correctly', async () => {
    const mockDb: Record<string, unknown> = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        return { data: { character_id: 'char-123', id: 'loc-456' }, error: null };
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    };

    const ctx: CommandContext = {
      db: mockDb as unknown as Record<string, unknown>,
      actorId: 'user-123'
    };

    const result = await changeLocationHandler({
      type: Commands.MOVE_CHARACTER,
      payload: { targetLocationId: 'loc-456' }
    }, ctx);

    expect(result.ok).toBe(true);
  });

  it('should allow entering a valid venue', async () => {
    let mockCallCount = 0;
    const mockDb: Record<string, unknown> = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        mockCallCount++;
        if (mockCallCount === 1) return { data: { character_id: 'char-123' }, error: null }; // activeChar
        if (mockCallCount === 2) return { data: { id: 'ven-1', zone_id: 'zone-1' }, error: null }; // venue
        if (mockCallCount === 3) return { data: { location_id: 'zone-1', venue_id: null }, error: null }; // char state
        return { data: null, error: null };
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    };

    const ctx: CommandContext = {
      db: mockDb as unknown as Record<string, unknown>,
      actorId: 'user-123'
    };

    const result = await enterVenueHandler({
      type: Commands.ENTER_VENUE,
      payload: { venueId: 'ven-1' }
    }, ctx);

    expect(result.ok).toBe(true);
    expect(result.state).toEqual({
      characterId: 'char-123',
      venueId: 'ven-1',
      zoneId: 'zone-1' // It should update to the venue's zone implicitly
    });
  });

  it('should fail entering a venue if already in it', async () => {
    let mockCallCount = 0;
    const mockDb: Record<string, unknown> = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        mockCallCount++;
        if (mockCallCount === 1) return { data: { character_id: 'char-123' }, error: null };
        if (mockCallCount === 2) return { data: { id: 'ven-1', zone_id: 'zone-1' }, error: null };
        if (mockCallCount === 3) return { data: { location_id: 'zone-1', venue_id: 'ven-1' }, error: null }; // Already in venue
        return { data: null, error: null };
      })
    };

    const ctx: CommandContext = {
      db: mockDb as unknown as Record<string, unknown>,
      actorId: 'user-123'
    };

    const result = await enterVenueHandler({
      type: Commands.ENTER_VENUE,
      payload: { venueId: 'ven-1' }
    }, ctx);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Already in this venue');
  });

  it('should allow leaving a venue', async () => {
    let mockCallCount = 0;
    const mockDb: Record<string, unknown> = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        mockCallCount++;
        if (mockCallCount === 1) return { data: { character_id: 'char-123' }, error: null };
        if (mockCallCount === 2) return { data: { venue_id: 'ven-1' }, error: null };
        return { data: null, error: null };
      })
    };

    const ctx: CommandContext = {
      db: mockDb as unknown as Record<string, unknown>,
      actorId: 'user-123'
    };

    const result = await leaveVenueHandler({
      type: Commands.LEAVE_VENUE,
      payload: {}
    }, ctx);

    expect(result.ok).toBe(true);
  });
});
