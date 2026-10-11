'use client';

import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';

export function DynamicLighting() {
  const gameHour = useGameStore((state) => state.gameHour);

  // Derive sun/ambient colors and intensity based on gameHour (0-23)
  const lighting = useMemo(() => {
    // Night: 21:00 - 05:00
    if (gameHour >= 21 || gameHour < 5) {
      return {
        ambientColor: '#121626',
        ambientIntensity: 0.6,
        sunColor: '#30416b',
        sunIntensity: 0.35,
        sunPosition: [10, 15, -10] as [number, number, number],
        fogColor: '#0a0d18',
        isNight: true,
      };
    }
    // Dawn / Early Morning: 05:00 - 08:00
    if (gameHour >= 5 && gameHour < 8) {
      return {
        ambientColor: '#d6a070',
        ambientIntensity: 0.85,
        sunColor: '#ff9d5c',
        sunIntensity: 1.1,
        sunPosition: [25, 12, 15] as [number, number, number],
        fogColor: '#f2caa0',
        isNight: false,
      };
    }
    // Midday Port Harcourt Sun: 08:00 - 16:00
    if (gameHour >= 8 && gameHour < 17) {
      return {
        ambientColor: '#f0f3f6',
        ambientIntensity: 1.1,
        sunColor: '#fff8eb',
        sunIntensity: 1.6,
        sunPosition: [15, 30, 10] as [number, number, number],
        fogColor: '#d5e4ec',
        isNight: false,
      };
    }
    // Sunset / Golden Hour: 17:00 - 21:00
    return {
      ambientColor: '#bf7656',
      ambientIntensity: 0.9,
      sunColor: '#ff7733',
      sunIntensity: 1.3,
      sunPosition: [-25, 10, -10] as [number, number, number],
      fogColor: '#cf7d53',
      isNight: false,
    };
  }, [gameHour]);

  return (
    <>
      <color attach="background" args={[lighting.fogColor]} />
      <fog attach="fog" args={[lighting.fogColor, 20, 65]} />

      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        color={lighting.sunColor}
        intensity={lighting.sunIntensity}
        position={lighting.sunPosition}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Warm Streetlamp Lights (turn on during night / dusk) */}
      {(lighting.isNight || gameHour >= 18 || gameHour < 7) && (
        <>
          <pointLight position={[-25, 4.5, -4.5]} color="#ffb050" intensity={2.8} distance={14} />
          <pointLight position={[-5, 4.5, -4.5]} color="#ffb050" intensity={2.8} distance={14} />
          <pointLight position={[15, 4.5, -4.5]} color="#ffb050" intensity={2.8} distance={14} />
          <pointLight position={[28, 4.5, -4.5]} color="#ffb050" intensity={2.8} distance={14} />

          {/* South side lamps */}
          <pointLight position={[-15, 4.5, 4.5]} color="#ffb050" intensity={2.8} distance={14} />
          <pointLight position={[5, 4.5, 4.5]} color="#ffb050" intensity={2.8} distance={14} />
          <pointLight position={[22, 4.5, 4.5]} color="#ffb050" intensity={2.8} distance={14} />

          {/* Mama Tarila Bole Grill ember glow */}
          <pointLight position={[-10, 1.2, -9]} color="#ff4500" intensity={3.5} distance={7} />
        </>
      )}
    </>
  );
}
