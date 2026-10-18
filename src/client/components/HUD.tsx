'use client';

import { useGameStore } from '../store/gameStore';

export function HUD() {
  const player = useGameStore((state) => state.player);
  const gameHour = useGameStore((state) => state.gameHour);
  const gameTime = useGameStore((state) => state.gameTime);
  const zoneName = useGameStore((state) => state.zoneName);
  const venues = useGameStore((state) => state.venues);
  const openModal = useGameStore((state) => state.openModal);

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

      {/* Player Stats & Authoritative Wallet Card (Clickable to open Passport) */}
      {player && (
        <div className="flex items-center gap-2 self-stretch sm:self-auto pointer-events-auto">
          <div
            onClick={() => openModal('passport')}
            className="cursor-pointer bg-black/80 hover:bg-zinc-900/90 backdrop-blur-md border border-white/10 hover:border-emerald-500/40 rounded-2xl px-4 py-2 text-white shadow-xl flex items-center gap-3 sm:gap-5 transition-all group"
            title="Open Citizen Passport & Ledger"
          >
            {/* Citizen Avatar Icon */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
                🇳🇬
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {player.displayName}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {player.jobTitle}
                </span>
              </div>
            </div>

            {/* Naira Wallet Balance */}
            <div className="flex flex-col border-l border-white/15 pl-3">
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
                Cash Wallet
              </span>
              <span className="text-emerald-400 font-bold text-base tracking-tight font-mono">
                ₦{player.walletBalance.toLocaleString()}
              </span>
            </div>

            {/* Vitals: Energy & Hunger */}
            <div className="hidden md:flex items-center gap-2.5 border-l border-white/15 pl-3">
              {/* Energy */}
              <div className="flex flex-col gap-1 w-14">
                <div className="flex justify-between text-[9px] text-zinc-300">
                  <span>⚡ Energy</span>
                  <span>{player.energy}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${player.energy}%` }}
                  />
                </div>
              </div>

              {/* Hunger */}
              <div className="flex flex-col gap-1 w-14">
                <div className="flex justify-between text-[9px] text-zinc-300">
                  <span>🍗 Hunger</span>
                  <span>{player.hunger}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${player.hunger}%` }}
                  />
                </div>
              </div>
            </div>

            <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded-lg border border-white/5 font-semibold group-hover:bg-emerald-600 group-hover:text-white transition-all">
              Passport ↗
            </span>
          </div>

          <button
            onClick={() => openModal('auth_characters')}
            className="cursor-pointer bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all text-xs font-bold"
            title="Switch or Create Citizen Character"
          >
            👤+
          </button>
        </div>
      )}
    </header>
  );
}
