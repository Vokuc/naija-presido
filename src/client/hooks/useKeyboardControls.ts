import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export function useKeyboardControls() {
  const keys = useRef<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const setMovementVector = useGameStore((state) => state.setMovementVector);
  const setIsMoving = useGameStore((state) => state.setIsMoving);
  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const nearbyInteractable = useGameStore((state) => state.nearbyInteractable);
  const openModal = useGameStore((state) => state.openModal);

  useEffect(() => {
    const updateMovement = () => {
      // Do not process WASD if modal is currently open
      if (useGameStore.getState().activeModal) {
        setMovementVector({ x: 0, z: 0 });
        setIsMoving(false);
        return;
      }

      let x = 0;
      let z = 0;

      if (keys.current.left) x -= 1;
      if (keys.current.right) x += 1;
      if (keys.current.forward) z -= 1;
      if (keys.current.backward) z += 1;

      // Normalize diagonal
      const length = Math.hypot(x, z);
      if (length > 0) {
        x /= length;
        z /= length;
      }

      setMovementVector({ x, z });
      setIsMoving(length > 0);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modals
      if (e.key === 'Escape') {
        if (useGameStore.getState().activeModal) {
          closeModal();
          return;
        }
      }

      // E or Enter to interact
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        const currentModal = useGameStore.getState().activeModal;
        const currentInteractable = useGameStore.getState().nearbyInteractable;
        if (!currentModal && currentInteractable) {
          if (currentInteractable.type === 'npc') {
            if (currentInteractable.id === '00000000-0000-0000-0000-0000000000a1') {
              openModal('bole_joint', currentInteractable.id);
            } else if (currentInteractable.id === '00000000-0000-0000-0000-0000000000a2') {
              openModal('keke_transit', currentInteractable.id);
            } else {
              openModal('npc_dialogue', currentInteractable.id);
            }
          } else if (currentInteractable.type === 'venue') {
            if (currentInteractable.id === '10000000-0000-0000-0000-000000000021') {
              openModal('bole_joint', currentInteractable.id);
            } else if (currentInteractable.id === '10000000-0000-0000-0000-000000000022') {
              openModal('keke_transit', currentInteractable.id);
            } else if (currentInteractable.id === '10000000-0000-0000-0000-000000000023') {
              openModal('plaza', currentInteractable.id);
            }
          }
          return;
        }
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keys.current.forward = true;
          break;
        case 's':
        case 'arrowdown':
          keys.current.backward = true;
          break;
        case 'a':
        case 'arrowleft':
          keys.current.left = true;
          break;
        case 'd':
        case 'arrowright':
          keys.current.right = true;
          break;
      }
      updateMovement();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keys.current.forward = false;
          break;
        case 's':
        case 'arrowdown':
          keys.current.backward = false;
          break;
        case 'a':
        case 'arrowleft':
          keys.current.left = false;
          break;
        case 'd':
        case 'arrowright':
          keys.current.right = false;
          break;
      }
      updateMovement();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setMovementVector, setIsMoving, activeModal, closeModal, nearbyInteractable, openModal]);
}
