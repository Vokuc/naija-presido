export interface WorldClock {
  id: string;
  epochReal: Date;
  epochGame: Date;
  scaleFactor: number;
  paused: boolean;
  pausedAt: Date | null;
}

export class WorldTimeService {
  constructor(private clock: WorldClock) {}

  /**
   * Derives the current game time deterministically based on the provided real time.
   * If realNow is not provided, it uses the current system time.
   */
  public getCurrentGameTime(realNow: Date = new Date()): Date {
    if (this.clock.paused) {
      return new Date(
        this.clock.epochGame.getTime() +
        (this.clock.pausedAt!.getTime() - this.clock.epochReal.getTime()) * this.clock.scaleFactor
      );
    }
    return new Date(
      this.clock.epochGame.getTime() +
      (realNow.getTime() - this.clock.epochReal.getTime()) * this.clock.scaleFactor
    );
  }

  /**
   * Derives the real-world time at which a specific game-world time will occur.
   */
  public getRealTimeForGameTime(gameTime: Date): Date {
    if (this.clock.paused) {
      throw new Error("Cannot predict real time for future game time while clock is paused");
    }
    const diffGameMs = gameTime.getTime() - this.clock.epochGame.getTime();
    const diffRealMs = diffGameMs / this.clock.scaleFactor;
    return new Date(this.clock.epochReal.getTime() + diffRealMs);
  }

  /**
   * Converts a real-world duration (in milliseconds) to game-world duration (in milliseconds).
   */
  public toGameDuration(realDurationMs: number): number {
    return realDurationMs * this.clock.scaleFactor;
  }

  /**
   * Converts a game-world duration (in milliseconds) to real-world duration (in milliseconds).
   */
  public toRealDuration(gameDurationMs: number): number {
    return gameDurationMs / this.clock.scaleFactor;
  }

  /**
   * Helper to check the current time of day in the game (0-23 hours).
   */
  public getGameTimeOfDay(realNow: Date = new Date()): number {
    const gameTime = this.getCurrentGameTime(realNow);
    return gameTime.getUTCHours(); 
    // Assuming UTC is used for game time to avoid timezone offsets
  }

  /**
   * Check if a specific scheduled event time has passed.
   */
  public isScheduledTimeReached(scheduledGameTime: Date, realNow: Date = new Date()): boolean {
    const currentGameTime = this.getCurrentGameTime(realNow);
    return currentGameTime.getTime() >= scheduledGameTime.getTime();
  }
}
