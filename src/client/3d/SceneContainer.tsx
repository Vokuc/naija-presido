'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { DynamicLighting } from './environment/DynamicLighting';
import { PortHarcourtNeighbourhood } from './environment/PortHarcourtNeighbourhood';
import { FollowCamera } from './controls/FollowCamera';
import { PlayerController } from './controls/PlayerController';
import { PlayerAvatar } from './entities/PlayerAvatar';
import { NpcAvatars } from './entities/NpcAvatars';
import { OtherPlayerAvatars } from './entities/OtherPlayerAvatars';

export function SceneContainer() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-zinc-950">
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 100 }}
        className="w-full h-full"
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          {/* Day/Night Dynamic Lighting */}
          <DynamicLighting />

          {/* Third-Person Camera Controls */}
          <FollowCamera />

          {/* Character Movement Logic */}
          <PlayerController />

          {/* 3D Port Harcourt Neighbourhood */}
          <PortHarcourtNeighbourhood />

          {/* Entities */}
          <PlayerAvatar />
          <NpcAvatars />
          <OtherPlayerAvatars />
        </Suspense>
      </Canvas>
    </div>
  );
}
