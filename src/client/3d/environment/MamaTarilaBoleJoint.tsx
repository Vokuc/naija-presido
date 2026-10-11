'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function MamaTarilaBoleJoint() {
  const smokeRef1 = useRef<THREE.Group>(null);
  const smokeRef2 = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (smokeRef1.current) {
      smokeRef1.current.position.y = 1.6 + Math.sin(t * 2) * 0.2;
      smokeRef1.current.scale.setScalar(0.8 + Math.sin(t * 1.5) * 0.2);
    }
    if (smokeRef2.current) {
      smokeRef2.current.position.y = 1.9 + Math.cos(t * 2.2) * 0.25;
      smokeRef2.current.scale.setScalar(0.9 + Math.cos(t * 1.8) * 0.2);
    }
  });

  return (
    <group position={[-12, 0, -11]}>
      {/* Concrete Bukka Slab Foundation */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[9, 0.2, 7]} />
        <meshStandardMaterial color="#7f8c8d" roughness={0.8} />
      </mesh>

      {/* 4 Wooden Corner Posts */}
      {[
        [-4.2, 1.6, -3.2],
        [4.2, 1.6, -3.2],
        [-4.2, 1.6, 3.2],
        [4.2, 1.6, 3.2],
      ].map(([x, y, z], i) => (
        <mesh key={`post-${i}`} position={[x, y, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 6]} />
          <meshStandardMaterial color="#5c3826" roughness={0.9} />
        </mesh>
      ))}

      {/* Corrugated Galvanized Zinc Slanted Roof */}
      <mesh
        position={[0, 3.3, 0]}
        rotation={[0.1, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[9.6, 0.08, 7.6]} />
        <meshStandardMaterial color="#95a5a6" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Bole Grill Station (at X: 2, Z: 2) */}
      <group position={[2, 0.2, 2]}>
        {/* Metal Half-Drum Barbecue */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 1.4, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#1f1f1f" metalness={0.8} roughness={0.6} />
        </mesh>

        {/* 4 Angle-Iron Grill Legs */}
        {[
          [-0.6, 0.3, -0.3],
          [0.6, 0.3, -0.3],
          [-0.6, 0.3, 0.3],
          [0.6, 0.3, 0.3],
        ].map(([x, y, z], i) => (
          <mesh key={`leg-${i}`} position={[x, y, z]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
            <meshStandardMaterial color="#111111" metalness={0.9} />
          </mesh>
        ))}

        {/* Glowing Charcoal Embers Inside Drum */}
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.7]} />
          <meshBasicMaterial color="#e74c3c" />
        </mesh>

        {/* Wire Grate Rack */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.35, 0.02, 0.8]} />
          <meshStandardMaterial color="#7f8c8d" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Roasted Plantains (Bole) on Grill */}
        {[-0.4, -0.15, 0.1, 0.35].map((x, i) => (
          <mesh key={`bole-${i}`} position={[x, 0.68, -0.15 + (i % 2) * 0.3]} rotation={[0, (i * 0.4), 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.35, 8]} />
            <meshStandardMaterial color="#d4ac0d" roughness={0.6} />
          </mesh>
        ))}

        {/* Roasted Spicy Croaker Fish on Grill */}
        <group position={[0, 0.69, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <coneGeometry args={[0.12, 0.45, 6]} />
            <meshStandardMaterial color="#962d16" roughness={0.5} />
          </mesh>
        </group>

        {/* Animated Rising Smoke Puffs */}
        <group ref={smokeRef1} position={[0, 1.4, 0]}>
          <mesh>
            <sphereGeometry args={[0.18, 6, 6]} />
            <meshStandardMaterial color="#ecf0f1" transparent opacity={0.35} roughness={1} />
          </mesh>
        </group>
        <group ref={smokeRef2} position={[0.15, 1.7, 0.05]}>
          <mesh>
            <sphereGeometry args={[0.24, 6, 6]} />
            <meshStandardMaterial color="#bdc3c7" transparent opacity={0.25} roughness={1} />
          </mesh>
        </group>
      </group>

      {/* Serving Wooden Counter Table */}
      <mesh position={[1.8, 0.55, 0.8]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>

      {/* Customer Seating Area: Plastic Chairs & Round Table */}
      {/* Table */}
      <group position={[-1.8, 0.2, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.05, 16]} />
          <meshStandardMaterial color="#2980b9" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.7} />
        </mesh>

        {/* 4 Colorful Plastic Chairs */}
        {[
          [0, 0, 1.1, 0, '#c0392b'],
          [0, 0, -1.1, Math.PI, '#2980b9'],
          [1.1, 0, 0, -Math.PI / 2, '#27ae60'],
          [-1.1, 0, 0, Math.PI / 2, '#f39c12'],
        ].map(([x, y, z, rot, col], i) => (
          <group key={`chair-${i}`} position={[Number(x), Number(y), Number(z)]} rotation={[0, Number(rot), 0]}>
            {/* Seat */}
            <mesh position={[0, 0.25, 0]} castShadow>
              <boxGeometry args={[0.45, 0.04, 0.45]} />
              <meshStandardMaterial color={String(col)} roughness={0.4} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 0.52, -0.2]} castShadow>
              <boxGeometry args={[0.42, 0.5, 0.04]} />
              <meshStandardMaterial color={String(col)} roughness={0.4} />
            </mesh>
            {/* 4 Legs */}
            {[
              [-0.18, 0.12, -0.18],
              [0.18, 0.12, -0.18],
              [-0.18, 0.12, 0.18],
              [0.18, 0.12, 0.18],
            ].map(([lx, ly, lz], j) => (
              <mesh key={`clegg-${j}`} position={[lx, ly, lz]}>
                <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
                <meshStandardMaterial color={String(col)} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Painted Wooden Signboard: "MAMA TARILA BOLE & FISH - PH ORIGINAL" */}
      <group position={[0, 3.8, 3.4]}>
        <mesh castShadow>
          <boxGeometry args={[4.8, 0.75, 0.08]} />
          <meshStandardMaterial color="#c0392b" roughness={0.6} />
        </mesh>
        {/* Signboard Banner Text Plate */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[4.6, 0.65]} />
          <meshBasicMaterial color="#f1c40f" />
        </mesh>
      </group>

      {/* Proximity Interaction Ground Ring (Entrance Zone) */}
      <mesh position={[0, 0.02, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.0, 32]} />
        <meshBasicMaterial color="#e67e22" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
