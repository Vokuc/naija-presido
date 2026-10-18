'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { broadcastMovement } from '../../store/realtimeStore';

// Movement boundaries for Port Harcourt D-Line neighbourhood
const BOUNDS = {
  minX: -32,
  maxX: 32,
  minZ: -20,
  maxZ: 20,
};

const MOVE_SPEED = 6.5; // meters per second

export function PlayerController() {
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  const setPosition = useGameStore((state) => state.setPosition);
  const movementVector = useGameStore((state) => state.movementVector);
  const isMoving = useGameStore((state) => state.isMoving);
  const player = useGameStore((state) => state.player);

  const wasMoving = useRef(false);

  useFrame((_, delta) => {
    // Clamp delta to avoid large jumps on frame drops
    const dt = Math.min(delta, 0.1);

    if (isMoving && (movementVector.x !== 0 || movementVector.z !== 0)) {
      wasMoving.current = true;

      // Calculate target angle based on movement vector
      targetRotation.current = Math.atan2(movementVector.x, movementVector.z);

      // Smoothly rotate towards target heading
      let diff = targetRotation.current - currentRotation.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      currentRotation.current += diff * Math.min(dt * 12, 1);

      // Move player position
      currentPos.current.x += movementVector.x * MOVE_SPEED * dt;
      currentPos.current.z += movementVector.z * MOVE_SPEED * dt;

      // Clamp to neighbourhood boundaries
      currentPos.current.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, currentPos.current.x));
      currentPos.current.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, currentPos.current.z));

      // Update Zustand store
      setPosition(
        [currentPos.current.x, currentPos.current.y, currentPos.current.z],
        currentRotation.current
      );

      // Broadcast high-frequency movement ephemerally to other players
      if (player) {
        broadcastMovement(
          { id: player.characterId, name: player.displayName },
          [currentPos.current.x, currentPos.current.y, currentPos.current.z],
          currentRotation.current,
          true
        );
      }
    } else if (wasMoving.current) {
      // Stopped transition: announce stationary status once only, avoiding 60Hz WebSocket flooding
      wasMoving.current = false;
      if (player) {
        broadcastMovement(
          { id: player.characterId, name: player.displayName },
          [currentPos.current.x, currentPos.current.y, currentPos.current.z],
          currentRotation.current,
          false
        );
      }
    }
  });

  return null;
}
