'use client';

export function RoadSystem() {
  return (
    <group>
      {/* Ground plane: Port Harcourt reddish earth & roadside grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[75, 55]} />
        <meshStandardMaterial color="#3a6042" roughness={0.9} />
      </mesh>

      {/* Olu Obasanjo Road - Asphalt Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 7]} />
        <meshStandardMaterial color="#23262b" roughness={0.7} />
      </mesh>

      {/* Road Centerline - Broken Yellow Stripes */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = -30 + i * 4.6;
        return (
          <group key={`centerline-${i}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -0.1]}>
              <planeGeometry args={[2.4, 0.14]} />
              <meshBasicMaterial color="#f1c40f" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0.1]}>
              <planeGeometry args={[2.4, 0.14]} />
              <meshBasicMaterial color="#f1c40f" />
            </mesh>
          </group>
        );
      })}

      {/* Zebra Crossing at Junction Center (X: 0) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`zebra-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, -2.8 + i * 0.8]}
        >
          <planeGeometry args={[2.2, 0.45]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Concrete Curbs - North & South */}
      <mesh position={[0, 0.1, -3.65]} receiveShadow castShadow>
        <boxGeometry args={[70, 0.22, 0.25]} />
        <meshStandardMaterial color="#95a5a6" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 3.65]} receiveShadow castShadow>
        <boxGeometry args={[70, 0.22, 0.25]} />
        <meshStandardMaterial color="#95a5a6" roughness={0.8} />
      </mesh>

      {/* Open Concrete Drainage Gutters (Iconic Nigerian Street Infrastructure) */}
      {/* North Gutter */}
      <mesh position={[0, -0.15, -3.95]} receiveShadow>
        <boxGeometry args={[70, 0.35, 0.45]} />
        <meshStandardMaterial color="#4a4f55" roughness={0.9} />
      </mesh>
      {/* South Gutter */}
      <mesh position={[0, -0.15, 3.95]} receiveShadow>
        <boxGeometry args={[70, 0.35, 0.45]} />
        <meshStandardMaterial color="#4a4f55" roughness={0.9} />
      </mesh>

      {/* Pedestrian Sidewalks */}
      {/* North Sidewalk */}
      <mesh position={[0, 0.05, -5.7]} receiveShadow>
        <boxGeometry args={[70, 0.12, 3.1]} />
        <meshStandardMaterial color="#bdc3c7" roughness={0.7} />
      </mesh>
      {/* South Sidewalk */}
      <mesh position={[0, 0.05, 5.7]} receiveShadow>
        <boxGeometry args={[70, 0.12, 3.1]} />
        <meshStandardMaterial color="#bdc3c7" roughness={0.7} />
      </mesh>

      {/* Road Shoulder Red Earth Borders (Port Harcourt Laterite) */}
      <mesh position={[0, 0.01, -7.5]} receiveShadow>
        <planeGeometry args={[70, 0.6]} />
        <meshStandardMaterial color="#8a4f3d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, 7.5]} receiveShadow>
        <planeGeometry args={[70, 0.6]} />
        <meshStandardMaterial color="#8a4f3d" roughness={0.95} />
      </mesh>
    </group>
  );
}
