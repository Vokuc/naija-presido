'use client';

export function GardenCityPlaza() {
  return (
    <group position={[14, 0, -14]}>
      {/* Main Plaza 2-Story Building Body */}
      <mesh position={[0, 3.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 7.2, 9]} />
        <meshStandardMaterial color="#f0dfc8" roughness={0.7} />
      </mesh>

      {/* Roof Parapet Rim */}
      <mesh position={[0, 7.35, 0]}>
        <boxGeometry args={[14.4, 0.4, 9.4]} />
        <meshStandardMaterial color="#d35400" roughness={0.6} />
      </mesh>

      {/* Blue Plastic GeePee Water Storage Tanks on Steel Stand (Roof Top) */}
      <group position={[4.5, 7.4, -2]}>
        {/* Steel Stand Scaffold */}
        {[
          [-0.8, 0.5, -0.8],
          [0.8, 0.5, -0.8],
          [-0.8, 0.5, 0.8],
          [0.8, 0.5, 0.8],
        ].map(([x, y, z], i) => (
          <mesh key={`tank-stand-${i}`} position={[x, y, z]}>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
            <meshStandardMaterial color="#2d3436" metalness={0.8} />
          </mesh>
        ))}
        {/* Tank Platform */}
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[2.0, 0.06, 2.0]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
        {/* Tank 1 (Blue cylindrical tank with black lid) */}
        <group position={[-0.45, 1.8, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.4, 16]} />
            <meshStandardMaterial color="#0984e3" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
        {/* Tank 2 (Black cylindrical tank with yellow brand band) */}
        <group position={[0.45, 1.8, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.4, 16]} />
            <meshStandardMaterial color="#2d3436" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      </group>

      {/* Wall-Mounted Split AC Outdoor Compressor Units */}
      {[
        [-4, 4.8, 4.6],
        [-1, 4.8, 4.6],
        [2.5, 4.8, 4.6],
        [5.5, 4.8, 4.6],
        [-4, 1.8, 4.6],
        [4, 1.8, 4.6],
      ].map(([x, y, z], i) => (
        <group key={`ac-${i}`} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.55, 0.35]} />
            <meshStandardMaterial color="#dfe6e9" roughness={0.5} />
          </mesh>
          {/* Fan Grille */}
          <mesh position={[0, 0, 0.18]}>
            <circleGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#636e72" />
          </mesh>
        </group>
      ))}

      {/* Ground Floor Storefront Entrance & Windows */}
      {/* Front Entrance Tiled Steps */}
      <mesh position={[0, 0.15, 4.7]} receiveShadow>
        <boxGeometry args={[3.6, 0.3, 0.8]} />
        <meshStandardMaterial color="#7f8c8d" roughness={0.6} />
      </mesh>

      {/* Glass Entrance Doors */}
      <group position={[0, 1.4, 4.52]}>
        <mesh>
          <boxGeometry args={[2.2, 2.4, 0.06]} />
          <meshStandardMaterial color="#74b9ff" transparent opacity={0.55} roughness={0.1} />
        </mesh>
        {/* Door Frame */}
        <mesh position={[-1.1, 0, 0]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
        <mesh position={[1.1, 0, 0]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
      </group>

      {/* Left Storefront Display (Garden City Tech & Gadgets) */}
      <group position={[-4.2, 1.4, 4.52]}>
        <mesh>
          <boxGeometry args={[3.2, 2.0, 0.06]} />
          <meshStandardMaterial color="#0984e3" transparent opacity={0.6} roughness={0.1} />
        </mesh>
        {/* Banner Over Shop */}
        <mesh position={[0, 1.25, 0.06]}>
          <planeGeometry args={[3.4, 0.45]} />
          <meshBasicMaterial color="#d63031" />
        </mesh>
      </group>

      {/* Right Storefront Display */}
      <group position={[4.2, 1.4, 4.52]}>
        <mesh>
          <boxGeometry args={[3.2, 2.0, 0.06]} />
          <meshStandardMaterial color="#00cec9" transparent opacity={0.6} roughness={0.1} />
        </mesh>
        {/* Banner Over Shop */}
        <mesh position={[0, 1.25, 0.06]}>
          <planeGeometry args={[3.4, 0.45]} />
          <meshBasicMaterial color="#00b894" />
        </mesh>
      </group>

      {/* Second Floor Windows */}
      {[-4.2, -1.5, 1.5, 4.2].map((x, i) => (
        <mesh key={`win2-${i}`} position={[x, 5.2, 4.52]}>
          <boxGeometry args={[1.8, 1.4, 0.05]} />
          <meshStandardMaterial color="#81ecec" transparent opacity={0.5} roughness={0.1} />
        </mesh>
      ))}

      {/* Main Plaza Signboard on Top Facade */}
      <group position={[0, 7.8, 4.6]}>
        <mesh castShadow>
          <boxGeometry args={[9.5, 0.95, 0.1]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.5} />
        </mesh>
        {/* Banner Face */}
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[9.2, 0.8]} />
          <meshBasicMaterial color="#f1c40f" />
        </mesh>
      </group>

      {/* Proximity Interaction Ring (In front of entrance) */}
      <mesh position={[0, 0.02, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.3, 32]} />
        <meshBasicMaterial color="#0984e3" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
