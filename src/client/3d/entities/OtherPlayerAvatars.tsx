'use client';

import { useGameStore } from '../../store/gameStore';
import { RemotePlayerAvatar } from './RemotePlayerAvatar';

export function OtherPlayerAvatars() {
  const remotePlayers = useGameStore((state) => state.remotePlayers);
  const otherPlayers = useGameStore((state) => state.otherPlayers);

  // If remotePlayers map is populated from presence, use it
  if (remotePlayers.size > 0) {
    return (
      <group>
        {Array.from(remotePlayers.values()).map((p) => (
          <RemotePlayerAvatar key={p.characterId} player={p} />
        ))}
      </group>
    );
  }

  // Fallback to otherPlayers map
  return (
    <group>
      {Array.from(otherPlayers.values()).map((p) => (
        <RemotePlayerAvatar
          key={p.id}
          player={{
            characterId: p.id,
            displayName: p.name,
            position: p.position,
            targetPosition: p.position,
            rotation: p.rotation,
            targetRotation: p.rotation,
            isMoving: p.isMoving,
            lastUpdated: Date.now(),
          }}
        />
      ))}
    </group>
  );
}
