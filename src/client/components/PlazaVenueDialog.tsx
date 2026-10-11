'use client';

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function PlazaVenueDialog() {
  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const performWorkShift = useGameStore((state) => state.performWorkShift);
  const enterVenue = useGameStore((state) => state.enterVenue);
  const leaveVenue = useGameStore((state) => state.leaveVenue);
  const player = useGameStore((state) => state.player);

  const [isProcessing, setIsProcessing] = useState(false);

  if (activeModal !== 'plaza') return null;

  const isInside = player?.venueId === '10000000-0000-0000-0000-000000000023';

  const handleWork = async () => {
    setIsProcessing(true);
    await performWorkShift();
    setIsProcessing(false);
  };

  const handleToggleVenue = async () => {
    setIsProcessing(true);
    if (isInside) {
      await leaveVenue();
    } else {
      await enterVenue('10000000-0000-0000-0000-000000000023');
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-2xl">
              🏢
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-300">
                Garden City Plaza
              </h2>
              <p className="text-xs text-zinc-400">
                Plot 12, Olu Obasanjo Road, Port Harcourt
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Commercial Plaza Overview */}
        <div className="my-4 p-4 rounded-2xl bg-blue-950/40 border border-blue-600/30 flex items-start gap-3">
          <span className="text-xl">🏬</span>
          <div className="text-xs text-blue-200 leading-relaxed">
            Welcome to Garden City Plaza. Commercial hub housing Garden City Tech & Gadgets, retail logistics, and business offices along Olu Obasanjo Road.
          </div>
        </div>

        {/* Action: Work Session Economy Loop */}
        <div className="flex flex-col gap-2.5 my-4">
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-zinc-100">
                Work Logistics Assistant Shift
              </span>
              <span className="text-xs text-zinc-400">
                Perform commercial warehouse shift (Earns ₦1,600 wage, consumes -15⚡)
              </span>
            </div>
            <button
              onClick={handleWork}
              disabled={isProcessing || (player?.energy ?? 0) < 15}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Work (+₦1,600)
            </button>
          </div>
        </div>

        {/* Venue Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4">
          <button
            onClick={handleToggleVenue}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isInside
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30'
            }`}
          >
            {isInside ? '← Step Out to Olu Obasanjo Road' : '🚪 Enter Plaza Interior'}
          </button>
          <button
            onClick={closeModal}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            Back to Walk
          </button>
        </div>
      </div>
    </div>
  );
}
