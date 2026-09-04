import { demoMaterials, type DemoMaterialDef } from "@/lib/studio/demo-materials";

interface BoxProps {
  size: [number, number, number];
  position: [number, number, number];
  material: DemoMaterialDef;
  name?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  rotation?: [number, number, number];
}

function Box({
  size,
  position,
  material,
  name,
  castShadow = false,
  receiveShadow = false,
  rotation,
}: BoxProps) {
  return (
    <mesh
      name={name}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={material.metalness}
      />
    </mesh>
  );
}

export default function DemoKitchen() {
  return (
    <>
      <group name="room">
        <group name="walls">
          <Box
            size={[5.2, 2.7, 0.08]}
            position={[0, 1.35, -2.6]}
            material={demoMaterials.walls}
            receiveShadow
          />
          <Box
            size={[0.08, 2.7, 2.9]}
            position={[-2.6, 1.35, -1.15]}
            material={demoMaterials.walls}
            receiveShadow
          />
        </group>
        <group name="floor">
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial
              color={demoMaterials.floor.color}
              roughness={demoMaterials.floor.roughness}
              metalness={demoMaterials.floor.metalness}
            />
          </mesh>
        </group>
      </group>

      <group name="perimeter-cabinets">
        <Box
          size={[1.9, 0.82, 0.58]}
          position={[-1.45, 0.41, -2.31]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[1.3, 0.82, 0.58]}
          position={[1.05, 0.41, -2.31]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[0.7, 2.2, 0.7]}
          position={[2.05, 1.1, -2.25]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[0.58, 0.82, 2.0]}
          position={[-2.31, 0.41, -1.4]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[1.9, 0.7, 0.34]}
          position={[-1.45, 1.9, -2.43]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[1.3, 0.7, 0.34]}
          position={[1.05, 1.9, -2.43]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          size={[0.34, 0.7, 1.8]}
          position={[-2.43, 1.9, -1.3]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
      </group>

      <group name="island-cabinets">
        <Box
          size={[1.8, 0.82, 0.9]}
          position={[0, 0.41, 0.9]}
          material={demoMaterials.island}
          castShadow
          receiveShadow
        />
      </group>

      <group name="countertops">
        <Box
          size={[1.95, 0.04, 0.64]}
          position={[-1.475, 0.84, -2.28]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          size={[2.05, 0.04, 0.64]}
          position={[1.425, 0.84, -2.28]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          size={[0.64, 0.04, 2.1]}
          position={[-2.28, 0.84, -1.4]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          size={[1.9, 0.04, 1.0]}
          position={[0, 0.84, 0.9]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
      </group>

      <group name="appliances">
        <Box
          size={[0.9, 0.84, 0.58]}
          position={[0, 0.42, -2.31]}
          material={demoMaterials.appliance}
          castShadow
        />
        <Box
          size={[0.95, 0.28, 0.45]}
          position={[0, 1.95, -2.36]}
          material={demoMaterials.appliance}
          castShadow
        />
      </group>

      <group name="hardware">
        <Box
          size={[0.03, 0.2, 0.02]}
          position={[-1.45, 0.52, -2.01]}
          material={demoMaterials.hardware}
        />
        <Box
          size={[0.03, 0.2, 0.02]}
          position={[1.05, 0.52, -2.01]}
          material={demoMaterials.hardware}
        />
        <Box
          size={[0.02, 0.2, 0.03]}
          position={[-2.01, 0.52, -1.0]}
          material={demoMaterials.hardware}
        />
        <Box
          size={[0.03, 0.18, 0.02]}
          position={[-1.45, 1.9, -2.25]}
          material={demoMaterials.hardware}
        />
        <Box
          size={[0.03, 0.18, 0.02]}
          position={[1.05, 1.9, -2.25]}
          material={demoMaterials.hardware}
        />
        <Box
          size={[0.03, 0.2, 0.02]}
          position={[0, 0.52, 1.36]}
          material={demoMaterials.hardware}
        />
      </group>
    </>
  );
}
