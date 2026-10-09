export interface WorldClock {
  id: string;
  epoch_real: Date;
  epoch_game: Date;
  scale_factor: number;
  paused: boolean;
  paused_at: Date | null;
  updated_at: Date;
}

export function computeGameTime(clock: WorldClock): Date {
  if (clock.paused) {
    return new Date(
      clock.epoch_game.getTime() +
      (clock.paused_at!.getTime() - clock.epoch_real.getTime()) * clock.scale_factor
    );
  }
  return new Date(
    clock.epoch_game.getTime() +
    (Date.now() - clock.epoch_real.getTime()) * clock.scale_factor
  );
}

export function realDurationForGameDuration(
  gameDurationSeconds: number,
  clock: WorldClock
): number {
  return (gameDurationSeconds / clock.scale_factor) * 1000;
}
