'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { EntityLabel } from './EntityLabel';
import { HumanCharacterModel } from './HumanCharacterModel';

export function NpcAvatars() {
  const npcs = useGameStore((state) => state.npcs);
  const nearbyInteractable = useGameStore((state) => state.nearbyInteractable);

  // Inspector Friday autonomous patrol along Olu Obasanjo sidewalk
  const fridayGroupRef = useRef<THREE.Group>(null);
  const fridayDirection = useRef(1); // 1 = right, -1 = left

  useFrame(() => {
    // Inspector Friday autonomous patrol along Olu Obasanjo sidewalk
    if (fridayGroupRef.current) {
      const patrolSpeed = 1.6; // m/s
      fridayGroupRef.current.position.x += fridayDirection.current * patrolSpeed * 0.016;

      // Turn around at patrol boundaries (-8m to 8m)
      if (fridayGroupRef.current.position.x > 8) {
        fridayDirection.current = -1;
        fridayGroupRef.current.rotation.y = -Math.PI / 2;
      } else if (fridayGroupRef.current.position.x < -8) {
        fridayDirection.current = 1;
        fridayGroupRef.current.rotation.y = Math.PI / 2;
      }
    }
  });

  const mama = npcs.find((n) => n.id === '00000000-0000-0000-0000-0000000000a1');
  const tamuno = npcs.find((n) => n.id === '00000000-0000-0000-0000-0000000000a2');
  const friday = npcs.find((n) => n.id === '00000000-0000-0000-0000-0000000000a3');

  return (
    <group>
      {/* 1. MAMA TARILA (Bole & Fish Queen at Bole Joint) */}
      {mama && (
        <group position={mama.position} rotation={[0, 0.4, 0]}>
          <EntityLabel
            name={mama.displayName}
            role="Bole & Fish Queen"
            activity={mama.activity}
            isNpc
            isNearby={nearbyInteractable?.id === mama.id}
          />
          <HumanCharacterModel
            gender="female"
            skinTone="#55382b"
            headwear="gele"
            headwearColor="#f39c12"
            outfit="ankara_dress"
            shirtColor="#f1c40f"
            trousersColor="#d4ac0d"
            shoesColor="#3d2314"
            accessory="tongs"
            idleVariant="grilling"
            isMoving={false}
          />
        </group>
      )}

      {/* 2. ELDER TAMUNO (Commercial Keke Operator at Garrison Park) */}
      {tamuno && (
        <group position={tamuno.position} rotation={[0, -0.4, 0]}>
          <EntityLabel
            name={tamuno.displayName}
            role="Keke Operator"
            activity={tamuno.activity}
            isNpc
            isNearby={nearbyInteractable?.id === tamuno.id}
          />
          <HumanCharacterModel
            gender="male"
            skinTone="#55382b"
            hairStyle="short_part"
            facialHair="beard"
            facialHairColor="#333333"
            headwear="keke_cap"
            headwearColor="#2c3e50"
            outfit="polo_shirt"
            shirtColor="#2980b9"
            trousersColor="#b2bec3"
            shoesColor="#5a3d28"
            accessory="watch"
            idleVariant="relaxed"
            isMoving={false}
          />
        </group>
      )}

      {/* 3. INSPECTOR FRIDAY (Community Patrol Officer) */}
      {friday && (
        <group ref={fridayGroupRef} position={friday.position} rotation={[0, Math.PI / 2, 0]}>
          <EntityLabel
            name={friday.displayName}
            role="Community Patrol"
            activity={friday.activity}
            isNpc
            isNearby={nearbyInteractable?.id === friday.id}
          />
          <HumanCharacterModel
            gender="male"
            skinTone="#4a2e22"
            hairStyle="fade"
            facialHair="trimmed_mustache"
            headwear="security_beret"
            headwearColor="#0c2461"
            outfit="security_uniform"
            shirtColor="#192a56"
            trousersColor="#111111"
            shoesColor="#0a0a0a"
            accessory="badge"
            idleVariant="patrol"
            isMoving={true}
            walkSpeedMultiplier={0.9}
          />
        </group>
      )}
    </group>
  );
}

