import { memo } from "react";
import { demoMaterials, type DemoMaterialDef } from "@/lib/studio/demo-materials";
import type { MaterialZoneId } from "@/lib/studio/material-zones";

interface BoxProps {
  name: string;
  zone: MaterialZoneId;
  editable?: boolean;
  size: [number, number, number];
  position: [number, number, number];
  material: DemoMaterialDef;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function Box({
  name,
  zone,
  editable = false,
  size,
  position,
  material,
  castShadow = false,
  receiveShadow = false,
}: BoxProps) {
  return (
    <mesh
      name={name}
      userData={{ zoneId: zone, appId: name, editable }}
      position={position}
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

function DemoKitchen() {
  return (
    <>
      <group name="perimeter-cabinets">
        <Box
          name="perimeter-base-left"
          zone="perimeter"
          editable
          size={[1.1, 0.82, 0.58]}
          position={[-0.65, 0.41, -2.07]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          name="perimeter-base-right"
          zone="perimeter"
          editable
          size={[1.1, 0.82, 0.58]}
          position={[0.65, 0.41, -2.07]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          name="perimeter-tall"
          zone="perimeter"
          size={[0.5, 2.2, 0.6]}
          position={[1.5, 1.1, -2.07]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          name="perimeter-side-base"
          zone="perimeter"
          editable
          size={[0.58, 0.82, 1.4]}
          position={[-1.46, 0.41, -0.8]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          name="perimeter-wall-left"
          zone="perimeter"
          size={[1.1, 0.7, 0.34]}
          position={[-0.65, 1.9, -2.25]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
        <Box
          name="perimeter-wall-right"
          zone="perimeter"
          size={[1.1, 0.7, 0.34]}
          position={[0.65, 1.9, -2.25]}
          material={demoMaterials.perimeter}
          castShadow
          receiveShadow
        />
      </group>

      <group name="island-cabinets">
        <Box
          name="island-base"
          zone="island"
          editable
          size={[1.4, 0.82, 0.8]}
          position={[0, 0.41, 0.45]}
          material={demoMaterials.island}
          castShadow
          receiveShadow
        />
      </group>

      <group name="countertops">
        <Box
          name="counter-back-left"
          zone="countertops"
          size={[1.16, 0.04, 0.64]}
          position={[-0.65, 0.84, -2.07]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          name="counter-back-right"
          zone="countertops"
          size={[1.16, 0.04, 0.64]}
          position={[0.65, 0.84, -2.07]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          name="counter-side"
          zone="countertops"
          size={[0.64, 0.04, 1.5]}
          position={[-1.46, 0.84, -0.8]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
        <Box
          name="counter-island"
          zone="countertops"
          size={[1.5, 0.04, 0.9]}
          position={[0, 0.84, 0.45]}
          material={demoMaterials.countertop}
          castShadow
          receiveShadow
        />
      </group>

      <group name="appliances">
        <Box
          name="appliance-range"
          zone="appliances"
          size={[0.7, 0.84, 0.58]}
          position={[0, 0.42, -2.07]}
          material={demoMaterials.appliance}
          castShadow
        />
        <Box
          name="appliance-hood"
          zone="appliances"
          size={[0.8, 0.28, 0.45]}
          position={[0, 1.95, -2.12]}
          material={demoMaterials.appliance}
          castShadow
        />
      </group>

      <group name="hardware">
        <Box
          name="hardware-1"
          zone="hardware"
          size={[0.03, 0.2, 0.02]}
          position={[-0.65, 0.52, -1.77]}
          material={demoMaterials.hardware}
        />
        <Box
          name="hardware-2"
          zone="hardware"
          size={[0.03, 0.2, 0.02]}
          position={[0.65, 0.52, -1.77]}
          material={demoMaterials.hardware}
        />
        <Box
          name="hardware-3"
          zone="hardware"
          size={[0.02, 0.2, 0.03]}
          position={[-1.16, 0.52, -0.8]}
          material={demoMaterials.hardware}
        />
        <Box
          name="hardware-4"
          zone="hardware"
          size={[0.03, 0.18, 0.02]}
          position={[-0.65, 1.9, -2.08]}
          material={demoMaterials.hardware}
        />
        <Box
          name="hardware-5"
          zone="hardware"
          size={[0.03, 0.18, 0.02]}
          position={[0.65, 1.9, -2.08]}
          material={demoMaterials.hardware}
        />
        <Box
          name="hardware-6"
          zone="hardware"
          size={[0.03, 0.2, 0.02]}
          position={[0, 0.52, 0.86]}
          material={demoMaterials.hardware}
        />
      </group>
    </>
  );
}

export default memo(DemoKitchen);
