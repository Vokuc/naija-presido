'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, NpcInfo } from '../../store/gameStore';
import { EntityLabel } from './EntityLabel';

export function NpcAvatars() {
  const npcs = useGameStore((state) => state.npcs);
  const nearbyInteractable = useGameStore((state) => state.nearbyInteractable);

  // Animation references
  const mamaArmRef = useRef<THREE.Group>(null);
  const fridayGroupRef = useRef<THREE.Group>(null);
  const fridayLegLeftRef = useRef<THREE.Group>(null);
  const fridayLegRightRef = useRef<THREE.Group>(null);
  const fridayDirection = useRef(1); // 1 = right, -1 = left

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Mama Tarila idle grilling animation
    if (mamaArmRef.current) {
      mamaArmRef.current.rotation.x = -0.4 + Math.sin(t * 2.5) * 0.2;
    }

    // 2. Inspector Friday autonomous patrol along Olu Obasanjo sidewalk
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

      // Patrol leg stride
      const walk = Math.sin(t * 8);
      if (fridayLegLeftRef.current) fridayLegLeftRef.current.rotation.x = walk * 0.45;
      if (fridayLegRightRef.current) fridayLegRightRef.current.rotation.x = -walk * 0.45;
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

          {/* Head & Orange/Yellow Headscarf (Gele) */}
          <mesh position={[0, 1.58, 0]} castShadow>
            <boxGeometry args={[0.34, 0.36, 0.34]} />
            <meshStandardMaterial color="#55382b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.76, -0.02]} castShadow>
            <boxGeometry args={[0.38, 0.16, 0.38]} />
            <meshStandardMaterial color="#f39c12" roughness={0.5} />
          </mesh>

          {/* Yellow Ankara Wrapper Dress */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.54, 0.62, 0.35]} />
            <meshStandardMaterial color="#f1c40f" roughness={0.6} />
          </mesh>

          {/* Red Cooking Apron on Front */}
          <mesh position={[0, 1.05, 0.19]}>
            <planeGeometry args={[0.38, 0.58]} />
            <meshStandardMaterial color="#c0392b" roughness={0.5} />
          </mesh>

          {/* Left Arm Resting */}
          <mesh position={[-0.35, 1.05, 0]} castShadow>
            <boxGeometry args={[0.15, 0.55, 0.15]} />
            <meshStandardMaterial color="#f1c40f" />
          </mesh>

          {/* Right Arm Holding Grilling Tongs (Animated) */}
          <group ref={mamaArmRef} position={[0.35, 1.35, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <boxGeometry args={[0.15, 0.55, 0.15]} />
              <meshStandardMaterial color="#f1c40f" />
            </mesh>
            {/* Grilling Tongs */}
            <mesh position={[0, -0.55, 0.18]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
              <meshStandardMaterial color="#7f8c8d" metalness={0.9} />
            </mesh>
          </group>

          {/* Lower Skirt Wrapper */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.38, 0.88, 10]} />
            <meshStandardMaterial color="#d4ac0d" roughness={0.6} />
          </mesh>
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

          {/* Head & Driver Newsboy Flat Cap */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.34, 0.36, 0.34]} />
            <meshStandardMaterial color="#55382b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.78, 0.04]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.4, 0.1, 0.44]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.8} />
          </mesh>

          {/* Striped Blue/White Transporter Polo Shirt */}
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[0.54, 0.6, 0.32]} />
            <meshStandardMaterial color="#2980b9" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.15, 0.17]}>
            <planeGeometry args={[0.48, 0.1]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Arms Leaning Pose */}
          <mesh position={[-0.35, 1.15, 0.1]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 0.55, 0.15]} />
            <meshStandardMaterial color="#2980b9" />
          </mesh>
          <mesh position={[0.35, 1.15, 0.1]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 0.55, 0.15]} />
            <meshStandardMaterial color="#2980b9" />
          </mesh>

          {/* Khaki Trousers & Sandals */}
          <mesh position={[-0.15, 0.42, 0]} castShadow>
            <boxGeometry args={[0.18, 0.84, 0.2]} />
            <meshStandardMaterial color="#b2bec3" roughness={0.8} />
          </mesh>
          <mesh position={[0.15, 0.42, 0]} castShadow>
            <boxGeometry args={[0.18, 0.84, 0.2]} />
            <meshStandardMaterial color="#b2bec3" roughness={0.8} />
          </mesh>
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

          {/* Head & Security Beret with Gold Badge */}
          <mesh position={[0, 1.62, 0]} castShadow>
            <boxGeometry args={[0.34, 0.36, 0.34]} />
            <meshStandardMaterial color="#4a2e22" roughness={0.7} />
          </mesh>
          <mesh position={[0.04, 1.8, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 10]} />
            <meshStandardMaterial color="#0c2461" roughness={0.4} />
          </mesh>
          <mesh position={[0.18, 1.82, 0.08]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#f1c40f" />
          </mesh>

          {/* Navy Security Officer Uniform Shirt */}
          <mesh position={[0, 1.16, 0]} castShadow>
            <boxGeometry args={[0.55, 0.6, 0.33]} />
            <meshStandardMaterial color="#192a56" roughness={0.6} />
          </mesh>
          {/* Security Badge on Chest */}
          <mesh position={[0.15, 1.25, 0.18]}>
            <planeGeometry args={[0.08, 0.1]} />
            <meshBasicMaterial color="#f1c40f" />
          </mesh>

          {/* Uniform Arms with Epaulets */}
          <mesh position={[-0.36, 1.16, 0]} castShadow>
            <boxGeometry args={[0.15, 0.58, 0.15]} />
            <meshStandardMaterial color="#192a56" />
          </mesh>
          <mesh position={[0.36, 1.16, 0]} castShadow>
            <boxGeometry args={[0.15, 0.58, 0.15]} />
            <meshStandardMaterial color="#192a56" />
          </mesh>

          {/* Black Combat Pants & Boots */}
          <group ref={fridayLegLeftRef} position={[-0.16, 0.84, 0]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <boxGeometry args={[0.19, 0.84, 0.21]} />
              <meshStandardMaterial color="#111111" roughness={0.8} />
            </mesh>
          </group>
          <group ref={fridayLegRightRef} position={[0.16, 0.84, 0]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <boxGeometry args={[0.19, 0.84, 0.21]} />
              <meshStandardMaterial color="#111111" roughness={0.8} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
