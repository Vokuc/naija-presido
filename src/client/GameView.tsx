'use client';

import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { SceneContainer } from './3d/SceneContainer';
import { HUD } from './components/HUD';
import { InteractionPrompt } from './components/InteractionPrompt';
import { MobileControls } from './components/MobileControls';
import { BoleJointDialog } from './components/BoleJointDialog';
import { KekeTransitDialog } from './components/KekeTransitDialog';
import { PlazaVenueDialog } from './components/PlazaVenueDialog';
import { NpcConversationDialog } from './components/NpcConversationDialog';
import { ToastNotification } from './components/ToastNotification';

export function GameView() {
  useGameLoop();
  useKeyboardControls();

  const isBootstrapped = useGameStore((state) => state.isBootstrapped);
  const isLoading = useGameStore((state) => state.isLoading);

  if (!isBootstrapped && isLoading) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4 p-4">
        <div className="w-14 h-14 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-amber-400">NAIJA PRESIDO</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Loading Port Harcourt (D-Line & Olu Obasanjo Road)...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full h-screen relative overflow-hidden bg-black select-none">
      {/* 3D R3F World Canvas */}
      <SceneContainer />

      {/* Top HUD Overlay */}
      <HUD />

      {/* Bottom Proximity Interaction Prompt */}
      <InteractionPrompt />

      {/* Touch / Mobile Controls */}
      <MobileControls />

      {/* Dialog Modals */}
      <BoleJointDialog />
      <KekeTransitDialog />
      <PlazaVenueDialog />
      <NpcConversationDialog />

      {/* Toast Notifications */}
      <ToastNotification />

      {/* Desktop Keybind Hints in Bottom-Left */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-20 pointer-events-none items-center gap-3 text-[11px] text-zinc-400 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">WASD</kbd>
          <span>Move</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">E</kbd>
          <span>Interact</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">ESC</kbd>
          <span>Close</span>
        </span>
      </div>
    </main>
  );
}
