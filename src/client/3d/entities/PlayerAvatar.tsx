'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { EntityLabel } from './EntityLabel';
import { HumanCharacterModel } from './HumanCharacterModel';

export function PlayerAvatar() {
  const position = useGameStore((state) => state.position);
  const rotation = useGameStore((state) => state.rotation);
  const isMoving = useGameStore((state) => state.isMoving);
  const player = useGameStore((state) => state.player);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.y = rotation;
    }
  });

  const shirtColor = (player?.avatarConfig as any)?.shirt || '#008751';
  const trousersColor = (player?.avatarConfig as any)?.trousers || '#1e272e';
  const skinColor = (player?.avatarConfig as any)?.skin || '#5c3e31';
  const gender = (player?.avatarConfig as any)?.gender || 'male';

  return (
    <group ref={groupRef}>
      <EntityLabel
        name={player?.displayName || 'Chidi'}
        role={player?.jobTitle || 'PH Resident'}
      />

      {/* Realistic Human Character Model */}
      <HumanCharacterModel
        gender={gender}
        skinTone={skinColor}
        outfit="ankara_shirt"
        shirtColor={shirtColor}
        trousersColor={trousersColor}
        hairStyle="fade"
        isMoving={isMoving}
        walkSpeedMultiplier={1.2}
      />
    </group>
  );
}

