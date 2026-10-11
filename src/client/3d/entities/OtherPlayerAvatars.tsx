'use client';

import { useGameStore } from '../../store/gameStore';
import { EntityLabel } from './EntityLabel';

export function OtherPlayerAvatars() {
  const otherPlayers = useGameStore((state) => state.otherPlayers);

  return (
    <group>
      {Array.from(otherPlayers.values()).map((p) => (
        <group
          key={p.id}
          position={p.position}
          rotation={[0, p.rotation, 0]}
        >
          <EntityLabel name={p.name} role="Online Citizen" />

          {/* Head */}
          <mesh position={[0, 1.62, 0]} castShadow>
            <boxGeometry args={[0.35, 0.38, 0.35]} />
            <meshStandardMaterial color="#634439" roughness={0.7} />
          </mesh>

          {/* Torso */}
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[0.55, 0.6, 0.32]} />
            <meshStandardMaterial color="#3498db" roughness={0.6} />
          </mesh>

          {/* Arms */}
          <mesh position={[-0.38, 1.1, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>
          <mesh position={[0.38, 1.1, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.16]} />
            <meshStandardMaterial color="#3498db" />
          </mesh>

          {/* Legs */}
          <mesh position={[-0.16, 0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.8} />
          </mesh>
          <mesh position={[0.16, 0.42, 0]} castShadow>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
