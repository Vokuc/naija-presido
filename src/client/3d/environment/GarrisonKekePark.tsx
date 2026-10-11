'use client';

function KekeNapep({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Chassis & Yellow Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.3, 0.5, 2.2]} />
        <meshStandardMaterial color="#f1c40f" roughness={0.4} />
      </mesh>

      {/* Nigerian Green Stripe along Side */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.32, 0.12, 2.1]} />
        <meshStandardMaterial color="#27ae60" roughness={0.3} />
      </mesh>

      {/* Front Nose Bonnet */}
      <mesh position={[0, 0.4, 1.2]} castShadow>
        <boxGeometry args={[0.9, 0.45, 0.5]} />
        <meshStandardMaterial color="#f1c40f" roughness={0.4} />
      </mesh>

      {/* Front Windscreen Frame & Glass */}
      <mesh position={[0, 0.95, 0.9]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.1, 0.65, 0.05]} />
        <meshStandardMaterial color="#81ecec" transparent opacity={0.6} roughness={0.1} />
      </mesh>

      {/* Black Vinyl Passenger Canopy / Roof */}
      <mesh position={[0, 1.35, -0.1]} castShadow>
        <boxGeometry args={[1.34, 0.15, 2.0]} />
        <meshStandardMaterial color="#1f2421" roughness={0.8} />
      </mesh>

      {/* Canopy Support Struts */}
      {[
        [-0.6, 0.95, -0.9],
        [0.6, 0.95, -0.9],
        [-0.6, 0.95, 0.6],
        [0.6, 0.95, 0.6],
      ].map(([x, y, z], i) => (
        <mesh key={`strut-${i}`} position={[x, y, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} />
        </mesh>
      ))}

      {/* 3 Wheels (Black rubber with silver hub) */}
      {/* Front Wheel */}
      <mesh position={[0, 0.22, 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      {/* Rear Left Wheel */}
      <mesh position={[-0.65, 0.25, -0.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.14, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      {/* Rear Right Wheel */}
      <mesh position={[0.65, 0.25, -0.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.14, 12]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      {/* Front Circular Headlight */}
      <mesh position={[0, 0.45, 1.48]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
        <meshBasicMaterial color="#fffa65" />
      </mesh>

      {/* Driver Seat & Handlebar */}
      <mesh position={[0, 0.65, 0.5]}>
        <boxGeometry args={[0.5, 0.12, 0.4]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      <mesh position={[0, 0.85, 0.75]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.55, 6]} />
        <meshStandardMaterial color="#636e72" metalness={0.8} />
      </mesh>

      {/* Rear Passenger Bench */}
      <mesh position={[0, 0.55, -0.5]}>
        <boxGeometry args={[1.05, 0.15, 0.55]} />
        <meshStandardMaterial color="#d63031" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function GarrisonKekePark() {
  return (
    <group position={[-10, 0, 12]}>
      {/* Concrete / Hard Gravel Paved Lot */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[12, 0.16, 9]} />
        <meshStandardMaterial color="#636e72" roughness={0.85} />
      </mesh>

      {/* Parked Keke 1 (Elder Tamuno's Keke) */}
      <KekeNapep position={[-3, 0, -0.5]} rotation={[0, 0.2, 0]} />

      {/* Parked Keke 2 */}
      <KekeNapep position={[0.5, 0, 0.8]} rotation={[0, -0.3, 0]} />

      {/* Parked Keke 3 */}
      <KekeNapep position={[3.8, 0, -0.2]} rotation={[0, 0.15, 0]} />

      {/* Passenger Waiting Shelter */}
      <group position={[-2, 0, -3.2]}>
        {/* Metal Canopy Poles */}
        {[
          [-2.2, 1.4, -0.8],
          [2.2, 1.4, -0.8],
          [-2.2, 1.4, 0.8],
          [2.2, 1.4, 0.8],
        ].map(([x, y, z], i) => (
          <mesh key={`shelter-pole-${i}`} position={[x, y, z]}>
            <cylinderGeometry args={[0.05, 0.05, 2.8, 6]} />
            <meshStandardMaterial color="#2d3436" metalness={0.7} />
          </mesh>
        ))}

        {/* Slanted Corrugated Sheet Roof */}
        <mesh position={[0, 2.8, 0]} rotation={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[5.2, 0.06, 2.2]} />
          <meshStandardMaterial color="#7f8c8d" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Long Passenger Waiting Bench */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.08, 0.55]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
        </mesh>
      </group>

      {/* Transport Union Signboard */}
      <group position={[0, 3.2, -4.2]}>
        <mesh castShadow>
          <boxGeometry args={[5.6, 0.9, 0.08]} />
          <meshStandardMaterial color="#27ae60" roughness={0.5} />
        </mesh>
        {/* Signboard Banner Plate */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[5.4, 0.78]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Proximity Interaction Ring (Near Road Entrance) */}
      <mesh position={[0, 0.02, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.0, 32]} />
        <meshBasicMaterial color="#27ae60" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
