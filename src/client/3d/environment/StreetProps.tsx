'use client';

function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Curved Trunk */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 3.6, 6]} />
        <meshStandardMaterial color="#6b4c35" roughness={0.9} />
      </mesh>
      {/* Palm Fronds Crown */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const angle = (i * Math.PI * 2) / 7;
        return (
          <group key={`frond-${i}`} position={[0, 3.5, 0]} rotation={[0.4, angle, 0]}>
            <mesh position={[0, 0, 1.2]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.6, 0.04, 2.2]} />
              <meshStandardMaterial color="#1e824c" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ElectricPole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tall Treated Wooden Pole */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 6.4, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>

      {/* Horizontal Wooden Crossarm */}
      <mesh position={[0, 6.0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.9} />
      </mesh>

      {/* 3 Ceramic Insulators on Top of Crossarm */}
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={`insulator-${i}`} position={[x, 6.12, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.15, 6]} />
          <meshStandardMaterial color="#ecf0f1" roughness={0.2} />
        </mesh>
      ))}

      {/* Streetlamp Arm & Fixture */}
      <group position={[0, 4.8, 0.4]}>
        <mesh rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 6]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.3, 0.35]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.18, 0.2, 8]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
        <mesh position={[0, -0.38, 0.35]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#fffa65" />
        </mesh>
      </group>
    </group>
  );
}

export function StreetProps() {
  return (
    <group>
      {/* Utility Electric Poles along North & South Sidewalks */}
      <ElectricPole position={[-25, 0, -4.6]} />
      <ElectricPole position={[-5, 0, -4.6]} />
      <ElectricPole position={[15, 0, -4.6]} />
      <ElectricPole position={[28, 0, -4.6]} />

      <ElectricPole position={[-15, 0, 4.6]} />
      <ElectricPole position={[5, 0, 4.6]} />
      <ElectricPole position={[22, 0, 4.6]} />

      {/* Overhead Low-Poly Power Cables (Lines connecting the poles) */}
      <mesh position={[-15, 6.12, -4.6]}>
        <boxGeometry args={[20, 0.015, 0.015]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
      <mesh position={[5, 6.12, -4.6]}>
        <boxGeometry args={[20, 0.015, 0.015]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
      <mesh position={[21.5, 6.12, -4.6]}>
        <boxGeometry args={[13, 0.015, 0.015]} />
        <meshBasicMaterial color="#111111" />
      </mesh>

      {/* South Side Power Cable */}
      <mesh position={[-5, 6.12, 4.6]}>
        <boxGeometry args={[20, 0.015, 0.015]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
      <mesh position={[13.5, 6.12, 4.6]}>
        <boxGeometry args={[17, 0.015, 0.015]} />
        <meshBasicMaterial color="#111111" />
      </mesh>

      {/* Palm Trees for "Garden City" Port Harcourt Ambience */}
      <PalmTree position={[-22, 0, -9]} scale={1.15} />
      <PalmTree position={[-17, 0, -13]} scale={1.0} />
      <PalmTree position={[4, 0, -12]} scale={1.2} />
      <PalmTree position={[26, 0, -10]} scale={1.1} />

      <PalmTree position={[-22, 0, 11]} scale={1.1} />
      <PalmTree position={[2, 0, 13]} scale={1.25} />
      <PalmTree position={[26, 0, 12]} scale={1.05} />

      {/* Small Shrub Bushes along Curbs */}
      {[
        [-28, 0, -4.8],
        [-18, 0, -4.8],
        [8, 0, -4.8],
        [20, 0, -4.8],
        [-20, 0, 4.8],
        [10, 0, 4.8],
        [28, 0, 4.8],
      ].map(([x, y, z], i) => (
        <mesh key={`bush-${i}`} position={[x, 0.35, z]} castShadow>
          <sphereGeometry args={[0.45, 7, 7]} />
          <meshStandardMaterial color="#27ae60" roughness={0.8} />
        </mesh>
      ))}

      {/* Street Signboard: "PORT HARCOURT: THE GARDEN CITY" */}
      <group position={[-2, 0, -4.7]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.4, 0]} castShadow>
          <boxGeometry args={[2.4, 0.8, 0.06]} />
          <meshStandardMaterial color="#009432" roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.4, 0.035]}>
          <planeGeometry args={[2.2, 0.65]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* A-Frame Pavement Chalkboard: "COLD ZOBO & MINERALS" */}
      <group position={[-7.5, 0, -4.7]} rotation={[0, 0.3, 0]}>
        <mesh position={[-0.1, 0.4, 0]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.04, 0.8, 0.55]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 0.4, 0]} rotation={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[0.04, 0.8, 0.55]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
