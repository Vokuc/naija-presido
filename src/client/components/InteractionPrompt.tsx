'use client';

import { useGameStore } from '../store/gameStore';

export function InteractionPrompt() {
  const nearbyInteractable = useGameStore((state) => state.nearbyInteractable);
  const activeModal = useGameStore((state) => state.activeModal);
  const openModal = useGameStore((state) => state.openModal);

  if (!nearbyInteractable || activeModal) return null;

  const handleClick = () => {
    if (nearbyInteractable.type === 'npc') {
      if (nearbyInteractable.id === '00000000-0000-0000-0000-0000000000a1') {
        openModal('bole_joint', nearbyInteractable.id);
      } else if (nearbyInteractable.id === '00000000-0000-0000-0000-0000000000a2') {
        openModal('keke_transit', nearbyInteractable.id);
      } else {
        openModal('npc_dialogue', nearbyInteractable.id);
      }
    } else if (nearbyInteractable.type === 'venue') {
      if (nearbyInteractable.id === '10000000-0000-0000-0000-000000000021') {
        openModal('bole_joint', nearbyInteractable.id);
      } else if (nearbyInteractable.id === '10000000-0000-0000-0000-000000000022') {
        openModal('keke_transit', nearbyInteractable.id);
      } else if (nearbyInteractable.id === '10000000-0000-0000-0000-000000000023') {
        openModal('plaza', nearbyInteractable.id);
      }
    }
  };

  return (
    <div className="absolute bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <button
        onClick={handleClick}
        className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-semibold text-sm shadow-2xl flex items-center gap-2.5 transition-all border border-amber-300 animate-bounce cursor-pointer"
      >
        <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black/20 rounded text-xs font-mono">
          E
        </span>
        <span>{nearbyInteractable.prompt}</span>
      </button>
    </div>
  );
}
