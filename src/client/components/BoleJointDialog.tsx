'use client';

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function BoleJointDialog() {
  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const buyItem = useGameStore((state) => state.buyItem);
  const greetCharacter = useGameStore((state) => state.greetCharacter);
  const enterVenue = useGameStore((state) => state.enterVenue);
  const leaveVenue = useGameStore((state) => state.leaveVenue);
  const player = useGameStore((state) => state.player);

  const [isProcessing, setIsProcessing] = useState(false);

  if (activeModal !== 'bole_joint') return null;

  const isInside = player?.venueId === '10000000-0000-0000-0000-000000000021';

  const handleBuyBole = async () => {
    setIsProcessing(true);
    await buyItem(
      'Port Harcourt Bole & Fish',
      '00000000-0000-0000-0000-0000000000a1',
      '10000000-0000-0000-0000-000000000021'
    );
    setIsProcessing(false);
  };

  const handleBuyZobo = async () => {
    setIsProcessing(true);
    await buyItem(
      'Cold Zobo Drink',
      '00000000-0000-0000-0000-0000000000a1',
      '10000000-0000-0000-0000-000000000021'
    );
    setIsProcessing(false);
  };

  const handleGreet = async () => {
    setIsProcessing(true);
    await greetCharacter('00000000-0000-0000-0000-0000000000a1');
    setIsProcessing(false);
  };

  const handleToggleVenue = async () => {
    setIsProcessing(true);
    if (isInside) {
      await leaveVenue();
    } else {
      await enterVenue('10000000-0000-0000-0000-000000000021');
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
              🥘
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-300">
                Mama Tarila Bole Joint
              </h2>
              <p className="text-xs text-zinc-400">
                D-Line, Olu Obasanjo Road • Established 2014
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

        {/* Mama Tarila Greeting */}
        <div className="my-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-600/30 flex items-start gap-3">
          <span className="text-xl">👩🏾‍🍳</span>
          <div className="text-xs text-amber-200 leading-relaxed italic">
            &ldquo;Welcome my person! Correct Port Harcourt Bole and fish dey hot ontop grill. Oya sit down make I serve you better plantain with spicy pepper sauce!&rdquo;
          </div>
        </div>

        {/* Menu & Action Cards */}
        <div className="flex flex-col gap-2.5 my-4">
          {/* Item 1: Bole & Fish */}
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-zinc-100">
                Port Harcourt Bole & Fish
              </span>
              <span className="text-xs text-zinc-400">
                Hot roasted plantain + dry spicy croaker fish (+35⚡, -50🍗)
              </span>
            </div>
            <button
              onClick={handleBuyBole}
              disabled={isProcessing || (player?.walletBalance ?? 0) < 1500}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Buy ₦1,500
            </button>
          </div>

          {/* Item 2: Zobo Drink */}
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-zinc-100">
                Cold Zobo Drink
              </span>
              <span className="text-xs text-zinc-400">
                Chilled spicy ginger zobo drink (+15⚡, -20🍗)
              </span>
            </div>
            <button
              onClick={handleBuyZobo}
              disabled={isProcessing || (player?.walletBalance ?? 0) < 200}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Buy ₦200
            </button>
          </div>

          {/* Social Greet */}
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-zinc-100">
                Greet Mama Tarila
              </span>
              <span className="text-xs text-zinc-400">
                Warm respect boosts relationship & neighbourhood popularity
              </span>
            </div>
            <button
              onClick={handleGreet}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-semibold text-xs shadow transition-all cursor-pointer active:scale-95"
            >
              &ldquo;Mama kodi o!&rdquo;
            </button>
          </div>
        </div>

        {/* Venue Transition & Close */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4">
          <button
            onClick={handleToggleVenue}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isInside
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isInside ? '← Step Out to Olu Obasanjo Road' : '🚪 Step Inside Bukka'}
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
