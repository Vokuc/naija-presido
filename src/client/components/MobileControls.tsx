'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function MobileControls() {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const setMovementVector = useGameStore((state) => state.setMovementVector);
  const setIsMoving = useGameStore((state) => state.setIsMoving);
  const nearbyInteractable = useGameStore((state) => state.nearbyInteractable);
  const activeModal = useGameStore((state) => state.activeModal);
  const openModal = useGameStore((state) => state.openModal);

  const maxRadius = 45; // Maximum joystick displacement in pixels

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeModal) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;

    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: normX, y: normY });

    // In 3D coordinate space: X is left/right, Y on joystick is forward/backward (Z in 3D)
    const vecX = normX / maxRadius;
    const vecZ = normY / maxRadius;

    const len = Math.hypot(vecX, vecZ);
    if (len > 0.15) {
      setMovementVector({ x: vecX, z: vecZ });
      setIsMoving(true);
    } else {
      setMovementVector({ x: 0, z: 0 });
      setIsMoving(false);
    }
  }, [setMovementVector, setIsMoving]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        setMovementVector({ x: 0, z: 0 });
        setIsMoving(false);
        break;
      }
    }
  };

  const handleActionButton = () => {
    if (!nearbyInteractable || activeModal) return;
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
    <div className="sm:hidden absolute inset-0 pointer-events-none z-30 select-none">
      {/* Virtual Joystick (Bottom Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute bottom-6 left-6 w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border border-white/20 pointer-events-auto flex items-center justify-center touch-none"
      >
        {/* Joystick Thumb Knob */}
        <div
          className="w-14 h-14 rounded-full bg-emerald-500/80 border-2 border-white shadow-xl transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Action Button (Bottom Right) */}
      {nearbyInteractable && !activeModal && (
        <button
          onClick={handleActionButton}
          className="absolute bottom-10 right-6 w-20 h-20 rounded-full bg-amber-500 active:bg-amber-400 border-2 border-amber-300 text-black font-bold text-lg shadow-2xl pointer-events-auto flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <span>E</span>
          <span className="text-[10px] font-semibold -mt-1">Action</span>
        </button>
      )}
    </div>
  );
}
