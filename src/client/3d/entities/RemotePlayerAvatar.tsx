'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { RemotePlayerState } from '../../realtime/types';
import { EntityLabel } from './EntityLabel';
import { HumanCharacterModel } from './HumanCharacterModel';

export function RemotePlayerAvatar({ player }: { player: RemotePlayerState }) {
  const groupRef = useRef<THREE.Group>(null);

  // Current interpolated position & heading
  const currentPos = useRef(new THREE.Vector3(...player.position));
  const currentRot = useRef(player.rotation);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // 1. Smooth Interpolation towards Target Position & Heading
    const [tx, ty, tz] = player.targetPosition;
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, tx, dt * 14);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, ty, dt * 14);
    currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, tz, dt * 14);

    // Shortest-arc angle interpolation
    let diff = player.targetRotation - currentRot.current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    currentRot.current += diff * Math.min(dt * 12, 1);

    if (groupRef.current) {
      groupRef.current.position.copy(currentPos.current);
      groupRef.current.rotation.y = currentRot.current;
    }
  });

  const hasSpeech =
    player.activeSpeechBubble && player.activeSpeechBubble.expiresAt > Date.now();

  const isMoving =
    player.isMoving ||
    Math.hypot(player.targetPosition[0] - currentPos.current.x, player.targetPosition[2] - currentPos.current.z) > 0.05;

  return (
    <group ref={groupRef} position={player.position}>
      {/* Overhead Name & Role Badge */}
      <EntityLabel
        name={player.displayName}
        role={player.jobTitle || 'Online Citizen'}
      />

      {/* Ephemeral Overhead Chat Speech Bubble */}
      {hasSpeech && (
        <Html position={[0, 2.7, 0]} center distanceFactor={14}>
          <div className="bg-amber-400 text-black px-3.5 py-1.5 rounded-2xl shadow-2xl font-bold text-xs whitespace-nowrap border-2 border-white pointer-events-none select-none animate-in fade-in zoom-in-75 duration-150">
            <span>💬 {player.activeSpeechBubble?.text}</span>
          </div>
        </Html>
      )}

      {/* Believable Human Character Model */}
      <HumanCharacterModel
        gender="male"
        skinTone="#634439"
        outfit="ankara_shirt"
        shirtColor="#0984e3"
        trousersColor="#2d3436"
        hairStyle="short_part"
        isMoving={isMoving}
        walkSpeedMultiplier={1.2}
      />
    </group>
  );
}

