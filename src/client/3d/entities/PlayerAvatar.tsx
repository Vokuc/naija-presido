'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { EntityLabel } from './EntityLabel';

export function PlayerAvatar() {
  const position = useGameStore((state) => state.position);
  const rotation = useGameStore((state) => state.rotation);
  const isMoving = useGameStore((state) => state.isMoving);
  const player = useGameStore((state) => state.player);

  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.y = rotation;
    }

    if (isMoving) {
      const walkCycle = Math.sin(t * 12);
      // Legs stride
      if (leftLegRef.current) leftLegRef.current.rotation.x = walkCycle * 0.6;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -walkCycle * 0.6;

      // Arms swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -walkCycle * 0.55;
      if (rightArmRef.current) rightArmRef.current.rotation.x = walkCycle * 0.55;

      // Gentle vertical bobbing
      if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * 12)) * 0.08;
    } else {
      // Return to resting idle
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (bodyRef.current) bodyRef.current.position.y = 0;
    }
  });

  const shirtColor = (player?.avatarConfig as any)?.shirt || '#008751';
  const trousersColor = (player?.avatarConfig as any)?.trousers || '#1e272e';
  const skinColor = (player?.avatarConfig as any)?.skin || '#634439';

  return (
    <group ref={groupRef}>
      <EntityLabel
        name={player?.displayName || 'Chidi'}
        role={player?.jobTitle || 'PH Resident'}
      />

      <group ref={bodyRef}>
        {/* Head */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <boxGeometry args={[0.35, 0.38, 0.35]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        {/* Torso with Custom Ankara Shirt */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.55, 0.6, 0.32]} />
          <meshStandardMaterial color={shirtColor} roughness={0.5} />
        </mesh>
        {/* Pattern Accent on Torso */}
        <mesh position={[0, 1.15, 0.17]}>
          <planeGeometry args={[0.2, 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.38, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.38, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef} position={[-0.16, 0.82, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color={trousersColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[0.16, 0.82, 0]}>
          <mesh position={[0, -0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color={trousersColor} roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
