"use client";

import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { memo } from "react";
import type { DimensionItem } from "@/lib/studio/dimensions";

const STATUS_COLOR: Record<string, string> = {
  neutral: "#71717a",
  warning: "#d97706",
  conflict: "#dc2626",
};

function ArrowTip({
  position,
  direction,
}: {
  position: [number, number, number];
  direction: THREE.Vector3;
}) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );
  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[0.035, 0.1, 6]} />
      <meshBasicMaterial color="#52525b" />
    </mesh>
  );
}

function DimensionLine({ item }: { item: DimensionItem }) {
  const start = new THREE.Vector3(...item.start);
  const end = new THREE.Vector3(...item.end);
  const direction = end.clone().sub(start).normalize();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const color = STATUS_COLOR[item.status ?? "neutral"];

  return (
    <group userData={{ dimension: true }}>
      <Line points={[item.start, item.end]} color={color} lineWidth={1.5} />
      <ArrowTip position={item.start} direction={direction} />
      <ArrowTip position={item.end} direction={direction.clone().negate()} />
      <Html
        position={[midpoint.x, midpoint.y, midpoint.z]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="whitespace-nowrap rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow-sm ring-1 ring-zinc-200"
          style={{ color }}
        >
          {item.label}
        </div>
      </Html>
    </group>
  );
}

function DimensionOverlay({ items }: { items: DimensionItem[] }) {
  return (
    <group name="dimensions">
      {items.map((item) => (
        <DimensionLine key={item.id} item={item} />
      ))}
    </group>
  );
}

export default memo(DimensionOverlay);
