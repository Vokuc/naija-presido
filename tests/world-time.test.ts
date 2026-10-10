import { describe, it, expect } from 'vitest';
import { WorldTimeService, WorldClock } from '../domains/world-time/service';

describe('World Time Service', () => {
  it('should correctly derive current game time at 60x scale', () => {
    // 60x scale: 1 real minute = 1 game hour
    const clock: WorldClock = {
      id: 'clock-1',
      epochReal: new Date('2026-10-10T12:00:00Z'),
      epochGame: new Date('2026-10-10T12:00:00Z'),
      scaleFactor: 60,
      paused: false,
      pausedAt: null
    };

    const service = new WorldTimeService(clock);
    
    // Simulate exactly 1 real minute later
    const realNow = new Date('2026-10-10T12:01:00Z');
    const expectedGameTime = new Date('2026-10-10T13:00:00Z');
    
    const gameNow = service.getCurrentGameTime(realNow);
    expect(gameNow).toEqual(expectedGameTime);
  });

  it('should prove gameplay code works seamlessly when scale factor changes to 24x', () => {
    // 24x scale: 1 real hour = 1 game day
    const clock: WorldClock = {
      id: 'clock-1',
      epochReal: new Date('2026-10-10T12:00:00Z'),
      epochGame: new Date('2026-10-10T12:00:00Z'),
      scaleFactor: 24,
      paused: false,
      pausedAt: null
    };

    const service = new WorldTimeService(clock);
    
    // Gameplay code: "I need to schedule a work shift that ends in 8 game hours"
    // The gameplay code simply calls toRealDuration(8 game hours) 
    const gameDurationMs = 8 * 60 * 60 * 1000; // 8 hours in ms
    const realDurationToWait = service.toRealDuration(gameDurationMs);
    
    // 8 game hours at 24x scale = 8/24 real hours = 1/3 real hour = 20 real minutes
    expect(realDurationToWait).toBe(20 * 60 * 1000); // 20 minutes
    
    // Simulate real time passing by 20 minutes
    const realNow = new Date(clock.epochReal.getTime() + realDurationToWait);
    const currentGameTime = service.getCurrentGameTime(realNow);
    
    // Game time should be 8 hours later
    expect(currentGameTime.toISOString()).toBe('2026-10-10T20:00:00.000Z');
  });

  it('should correctly predict when a game time occurs in the real world', () => {
    const clock: WorldClock = {
      id: 'clock-1',
      epochReal: new Date('2026-10-10T12:00:00Z'),
      epochGame: new Date('2026-10-10T12:00:00Z'),
      scaleFactor: 60,
      paused: false,
      pausedAt: null
    };

    const service = new WorldTimeService(clock);
    
    // When is it 6:00 PM game time?
    const targetGameTime = new Date('2026-10-10T18:00:00Z'); // 6 hours ahead in game
    const predictedRealTime = service.getRealTimeForGameTime(targetGameTime);
    
    // 6 game hours ahead at 60x scale = 6 real minutes ahead
    expect(predictedRealTime.toISOString()).toBe('2026-10-10T12:06:00.000Z');
  });

  it('should correctly extract time of day in game time', () => {
    const clock: WorldClock = {
      id: 'clock-1',
      epochReal: new Date('2026-10-10T12:00:00Z'),
      epochGame: new Date('2026-10-10T12:00:00Z'),
      scaleFactor: 60,
      paused: false,
      pausedAt: null
    };

    const service = new WorldTimeService(clock);
    
    // Real time is 4.5 minutes after epoch.
    // 4.5 real minutes * 60 = 270 game minutes = 4.5 game hours.
    // So game time is 16:30:00Z
    const realNow = new Date('2026-10-10T12:04:30Z');
    const gameTimeOfDay = service.getGameTimeOfDay(realNow);
    
    expect(gameTimeOfDay).toBe(16); // 16:00 hours UTC
  });

  it('should return frozen game time when paused', () => {
    const clock: WorldClock = {
      id: 'clock-1',
      epochReal: new Date('2026-10-10T12:00:00Z'),
      epochGame: new Date('2026-10-10T12:00:00Z'),
      scaleFactor: 60,
      paused: true,
      pausedAt: new Date('2026-10-10T12:02:00Z') // Paused 2 real minutes in
    };

    const service = new WorldTimeService(clock);
    
    // Even if we check 1 hour real time later
    const realNow = new Date('2026-10-10T13:00:00Z');
    
    // Game time should be frozen at 2 game hours (since it was paused at 2 real minutes)
    const gameNow = service.getCurrentGameTime(realNow);
    expect(gameNow.toISOString()).toBe('2026-10-10T14:00:00.000Z');
  });
});
