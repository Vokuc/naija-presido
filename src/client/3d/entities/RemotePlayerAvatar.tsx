'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { RemotePlayerState } from '../../realtime/types';
import { EntityLabel } from './EntityLabel';

export function RemotePlayerAvatar({ player }: { player: RemotePlayerState }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  // Current interpolated position & heading
  const currentPos = useRef(new THREE.Vector3(...player.position));
  const currentRot = useRef(player.rotation);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.getElapsedTime();

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

    // 2. Walking Strides Animation
    const isMoving = player.isMoving || Math.hypot(tx - currentPos.current.x, tz - currentPos.current.z) > 0.05;

    if (isMoving) {
      const walkCycle = Math.sin(t * 12);
      if (leftLegRef.current) leftLegRef.current.rotation.x = walkCycle * 0.6;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -walkCycle * 0.6;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -walkCycle * 0.55;
      if (rightArmRef.current) rightArmRef.current.rotation.x = walkCycle * 0.55;
      if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * 12)) * 0.08;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (bodyRef.current) bodyRef.current.position.y = 0;
    }
  });

  const hasSpeech =
    player.activeSpeechBubble && player.activeSpeechBubble.expiresAt > Date.now();

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

      {/* Humanoid Low-Poly Body */}
      <group ref={bodyRef}>
        {/* Head */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <boxGeometry args={[0.35, 0.38, 0.35]} />
          <meshStandardMaterial color="#634439" roughness={0.7} />
        </mesh>

        {/* Torso (Blue Ankara Shirt) */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.55, 0.6, 0.32]} />
          <meshStandardMaterial color="#0984e3" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.15, 0.17]}>
          <planeGeometry args={[0.2, 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.38, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color="#0984e3" roughness={0.6} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.38, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color="#0984e3" roughness={0.6} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef} position={[-0.16, 0.82, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color="#2d3436" roughness={0.8} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[0.16, 0.82, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color="#2d3436" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
