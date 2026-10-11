'use client';

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function NpcConversationDialog() {
  const activeModal = useGameStore((state) => state.activeModal);
  const activeNpcId = useGameStore((state) => state.activeNpcId);
  const closeModal = useGameStore((state) => state.closeModal);
  const greetCharacter = useGameStore((state) => state.greetCharacter);
  const npcs = useGameStore((state) => state.npcs);

  const [isProcessing, setIsProcessing] = useState(false);

  if (activeModal !== 'npc_dialogue') return null;

  const npc = npcs.find((n) => n.id === activeNpcId);
  if (!npc) return null;

  const handleGreet = async () => {
    setIsProcessing(true);
    await greetCharacter(npc.id);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
              👮🏾‍♂️
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-300">
                {npc.displayName}
              </h2>
              <p className="text-xs text-zinc-400">
                {npc.role} • Olu Obasanjo Road
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

        {/* Dialogue Bubble */}
        <div className="my-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-600/30 flex items-start gap-3">
          <span className="text-xl">💬</span>
          <div className="text-xs text-amber-200 leading-relaxed italic">
            &ldquo;Good day my brother! Garden City dey calm and secured. Peace and safety na our priority for Olu Obasanjo Road. Keep your eyes open.&rdquo;
          </div>
        </div>

        {/* Interaction Actions */}
        <div className="flex flex-col gap-2.5 my-4">
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 flex items-center justify-between transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-zinc-100">
                Exchange Respect & Greet Officer
              </span>
              <span className="text-xs text-zinc-400">
                Builds local community relationship and standing
              </span>
            </div>
            <button
              onClick={handleGreet}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              &ldquo;Good afternoon Officer!&rdquo;
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-white/10 mt-4">
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
