'use client';

export function ResidentialCompound() {
  return (
    <group position={[14, 0, 13]}>
      {/* Compound Perimeter Block Wall */}
      {/* Front Left Wall */}
      <mesh position={[-4.5, 1.4, -4.5]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 2.8, 0.35]} />
        <meshStandardMaterial color="#dcdde1" roughness={0.8} />
      </mesh>
      {/* Front Right Wall */}
      <mesh position={[4.5, 1.4, -4.5]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 2.8, 0.35]} />
        <meshStandardMaterial color="#dcdde1" roughness={0.8} />
      </mesh>
      {/* East Side Wall */}
      <mesh position={[6.6, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 2.8, 9.35]} />
        <meshStandardMaterial color="#dcdde1" roughness={0.8} />
      </mesh>
      {/* West Side Wall */}
      <mesh position={[-6.6, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 2.8, 9.35]} />
        <meshStandardMaterial color="#dcdde1" roughness={0.8} />
      </mesh>
      {/* Back Wall */}
      <mesh position={[0, 1.4, 4.6]} castShadow receiveShadow>
        <boxGeometry args={[13.5, 2.8, 0.35]} />
        <meshStandardMaterial color="#dcdde1" roughness={0.8} />
      </mesh>

      {/* Wall Top Security Spikes / Razor Wire Mesh */}
      {[-5, -4, -3, 3, 4, 5].map((x, i) => (
        <mesh key={`spike-${i}`} position={[x, 2.9, -4.5]}>
          <coneGeometry args={[0.06, 0.3, 4]} />
          <meshStandardMaterial color="#2f3542" metalness={0.9} />
        </mesh>
      ))}

      {/* Main Steel Compound Gate (Double Leaf Gate) */}
      <group position={[0, 1.3, -4.48]}>
        {/* Left Gate Leaf */}
        <mesh position={[-1.15, 0, 0]} castShadow>
          <boxGeometry args={[2.2, 2.6, 0.08]} />
          <meshStandardMaterial color="#1e272e" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Right Gate Leaf */}
        <mesh position={[1.15, 0, 0]} castShadow>
          <boxGeometry args={[2.2, 2.6, 0.08]} />
          <meshStandardMaterial color="#1e272e" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Decorative Gold Fleur-de-lis / Crest Accents */}
        <mesh position={[0, 0.2, 0.05]}>
          <boxGeometry args={[0.5, 0.5, 0.02]} />
          <meshStandardMaterial color="#e1b12c" metalness={0.8} />
        </mesh>
      </group>

      {/* Two Sturdy Gate Pillars */}
      <mesh position={[-2.4, 1.5, -4.5]} castShadow>
        <boxGeometry args={[0.6, 3.0, 0.6]} />
        <meshStandardMaterial color="#718093" roughness={0.7} />
      </mesh>
      <mesh position={[2.4, 1.5, -4.5]} castShadow>
        <boxGeometry args={[0.6, 3.0, 0.6]} />
        <meshStandardMaterial color="#718093" roughness={0.7} />
      </mesh>
      {/* Pillar Lantern Caps */}
      <mesh position={[-2.4, 3.15, -4.5]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#f5cd79" />
      </mesh>
      <mesh position={[2.4, 3.15, -4.5]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#f5cd79" />
      </mesh>

      {/* Generator House ("Gen House") in the Corner */}
      <group position={[-4.5, 0, 1.8]}>
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 2.0, 2.2]} />
          <meshStandardMaterial color="#ced6e0" roughness={0.9} />
        </mesh>
        {/* Slanted Tin Roof */}
        <mesh position={[0, 2.08, 0]} rotation={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.06, 2.4]} />
          <meshStandardMaterial color="#747d8c" metalness={0.7} />
        </mesh>
        {/* Generator Exhaust Pipe */}
        <mesh position={[1.1, 1.6, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
          <meshStandardMaterial color="#2f3542" metalness={0.9} />
        </mesh>
      </group>

      {/* Residential Duplex Body visible inside */}
      <mesh position={[1.5, 2.8, 1.5]} castShadow receiveShadow>
        <boxGeometry args={[7.5, 5.6, 5.5]} />
        <meshStandardMaterial color="#f8efba" roughness={0.7} />
      </mesh>
      {/* Duplex Pitched Roof */}
      <mesh position={[1.5, 6.2, 1.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[5.2, 1.8, 4]} />
        <meshStandardMaterial color="#b33939" roughness={0.5} />
      </mesh>
    </group>
  );
}
