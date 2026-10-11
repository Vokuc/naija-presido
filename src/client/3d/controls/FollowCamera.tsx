'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

export function FollowCamera() {
  const { camera } = useThree();
  const position = useGameStore((state) => state.position);

  // Offset behind and above player
  const offset = useRef(new THREE.Vector3(0, 7.5, 9.5));
  const lookTarget = useRef(new THREE.Vector3(0, 1.2, 0));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const [px, py, pz] = position;

    // Desired camera target position
    const targetX = px + offset.current.x;
    const targetY = py + offset.current.y;
    const targetZ = pz + offset.current.z;

    // Smoothly lerp camera position
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, dt * 5);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, dt * 5);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, dt * 5);

    // Smoothly lerp look-at point
    lookTarget.current.x = THREE.MathUtils.lerp(lookTarget.current.x, px, dt * 8);
    lookTarget.current.y = THREE.MathUtils.lerp(lookTarget.current.y, py + 1.2, dt * 8);
    lookTarget.current.z = THREE.MathUtils.lerp(lookTarget.current.z, pz, dt * 8);

    camera.lookAt(lookTarget.current);
  });

  return null;
}
