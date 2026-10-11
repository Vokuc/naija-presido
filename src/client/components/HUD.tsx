'use client';

import { useGameStore } from '../store/gameStore';

export function HUD() {
  const player = useGameStore((state) => state.player);
  const gameHour = useGameStore((state) => state.gameHour);
  const gameTime = useGameStore((state) => state.gameTime);
  const zoneName = useGameStore((state) => state.zoneName);
  const venues = useGameStore((state) => state.venues);

  const activeVenue = player?.venueId
    ? venues.find((v) => v.id === player.venueId)
    : null;

  // Format hour string (e.g. 14:00)
  const timeFormatted = new Date(gameTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const isNight = gameHour >= 20 || gameHour < 6;

  return (
    <header className="absolute top-0 left-0 right-0 p-3 sm:p-4 pointer-events-none select-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 z-20">
      {/* Location & Time Card */}
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-white shadow-xl flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold tracking-wide">
            <span>📍</span>
            <span>{activeVenue ? activeVenue.name : zoneName}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-300">
            <span>{isNight ? '🌙' : '☀️'}</span>
            <span className="font-mono">{timeFormatted}</span>
            <span className="text-zinc-400">
              {gameHour >= 6 && gameHour < 12
                ? 'Morning'
                : gameHour >= 12 && gameHour < 17
                ? 'Afternoon'
                : gameHour >= 17 && gameHour < 21
                ? 'Dusk'
                : 'Night'}
            </span>
          </div>
        </div>
      </div>

      {/* Player Stats & Authoritative Wallet */}
      {player && (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 text-white shadow-xl flex items-center gap-4 sm:gap-6 self-stretch sm:self-auto justify-between sm:justify-start">
          {/* Naira Wallet Balance */}
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
              Cash Balance
            </span>
            <span className="text-emerald-400 font-bold text-lg tracking-tight font-mono">
              ₦{player.walletBalance.toLocaleString()}
            </span>
          </div>

          {/* Vitals: Energy & Hunger */}
          <div className="flex items-center gap-3 border-l border-white/15 pl-4">
            {/* Energy */}
            <div className="flex flex-col gap-1 w-16">
              <div className="flex justify-between text-[10px] text-zinc-300">
                <span>⚡ Energy</span>
                <span>{player.energy}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${player.energy}%` }}
                />
              </div>
            </div>

            {/* Hunger */}
            <div className="flex flex-col gap-1 w-16">
              <div className="flex justify-between text-[10px] text-zinc-300">
                <span>🍗 Hunger</span>
                <span>{player.hunger}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${player.hunger}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
