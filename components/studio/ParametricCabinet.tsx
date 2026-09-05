"use client";

import { useMemo } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CabinetInstance } from "@/lib/studio/cabinet";

const BOX = "#e8e2d7";
const FRONT = "#c9b99a";
const HARDWARE = "#4a4a4a";

type ResolvedMaterial = { color: string; roughness: number; metalness: number };

function useSharedMaterial(material: ResolvedMaterial) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: material.color,
        roughness: material.roughness,
        metalness: material.metalness,
      }),
    [material.color, material.roughness, material.metalness],
  );
}

export default function ParametricCabinet({
  instance,
  selected,
  onSelect,
  onRegisterObject,
  materials,
  preview,
}: {
  instance: CabinetInstance;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onRegisterObject?: (id: string, object: THREE.Group | null) => void;
  materials?: { box: ResolvedMaterial; front: ResolvedMaterial; hardware: ResolvedMaterial };
  preview?: boolean;
}) {
  const box = useSharedMaterial(materials?.box ?? { color: BOX, roughness: 0.75, metalness: 0.05 });
  const front = useSharedMaterial(materials?.front ?? { color: FRONT, roughness: 0.55, metalness: 0.05 });
  const hardware = useSharedMaterial(materials?.hardware ?? { color: HARDWARE, roughness: 0.35, metalness: 0.7 });
  const t = 0.019;
  const back = 0.006;
  const toeH = instance.category === "wall" ? 0 : 0.1;
  const toeR = instance.category === "wall" ? 0 : 0.076;
  const w = instance.widthM;
  const h = instance.heightM;
  const d = instance.depthM;

  const doors = Math.max(instance.doorCount, instance.frontType === "drawer" ? 0 : 1);
  const drawers = instance.drawerCount;

  const parts: { name: string; pos: [number, number, number]; size: [number, number, number]; mat: THREE.MeshStandardMaterial }[] = [];
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (onRegisterObject) {
      onRegisterObject(instance.id, groupRef.current);
    }
    return () => {
      onRegisterObject?.(instance.id, null);
    };
  }, [instance.id, onRegisterObject]);

  parts.push({ name: "left", pos: [-w / 2 + t / 2, toeH + (h - toeH) / 2, 0], size: [t, h - toeH, d], mat: box });
  parts.push({ name: "right", pos: [w / 2 - t / 2, toeH + (h - toeH) / 2, 0], size: [t, h - toeH, d], mat: box });
  parts.push({ name: "bottom", pos: [0, toeH + t / 2, 0], size: [w - 2 * t, t, d], mat: box });
  parts.push({ name: "top", pos: [0, h - t / 2, 0], size: [w - 2 * t, t, d], mat: box });
  parts.push({ name: "back", pos: [0, toeH + (h - toeH) / 2, -d / 2 + back / 2], size: [w - 2 * t, h - toeH, back], mat: box });

  if (toeH > 0) {
    parts.push({ name: "toe", pos: [0, toeH / 2, -toeR / 2], size: [w - 2 * t, toeH, d - toeR], mat: box });
  }

  const frontGap = 0.003;
  if (doors > 0) {
    const doorW = (w - (doors + 1) * frontGap) / doors;
    for (let i = 0; i < doors; i += 1) {
      parts.push({ name: `door-${i + 1}`, pos: [-w / 2 + frontGap + doorW / 2 + i * (doorW + frontGap), toeH + (h - toeH) / 2, d / 2 + t / 2], size: [doorW, h - toeH - 2 * frontGap, t], mat: front });
    }
  }
  if (drawers > 0) {
    const drawerH = (h - toeH - (drawers + 1) * frontGap) / drawers;
    for (let i = 0; i < drawers; i += 1) {
      parts.push({ name: `drawer-${i + 1}`, pos: [0, toeH + frontGap + drawerH / 2 + i * (drawerH + frontGap), d / 2 + t / 2], size: [w - 2 * frontGap, drawerH, t], mat: front });
    }
  }

  const knobZ = d / 2 + t + 0.008;
  parts.push({ name: "pull-1", pos: [-w / 6, toeH + (h - toeH) * 0.75, knobZ], size: [0.03, 0.03, 0.03], mat: hardware });
  parts.push({ name: "pull-2", pos: [w / 6, toeH + (h - toeH) * 0.75, knobZ], size: [0.03, 0.03, 0.03], mat: hardware });

  return (
    <group
      ref={groupRef}
      name={instance.name}
      position={instance.position}
      rotation={instance.rotation}
      visible={!instance.hidden}
      raycast={preview ? () => null : undefined}
      userData={{ appId: instance.id, cabinetId: instance.id, kind: "cabinet" }}
      onClick={(event) => {
        if (preview) return;
        event.stopPropagation();
        onSelect(instance.id, event.nativeEvent.ctrlKey || event.nativeEvent.metaKey);
      }}
    >
      {parts.map((part) => (
        <mesh
          key={part.name}
          name={`${instance.id}:${part.name}`}
          position={part.pos}
          material={part.mat}
          userData={{ materialArea: part.mat === box ? "cabinet-box" : part.mat === front ? "cabinet-front" : "cabinet-hardware" }}
          castShadow
          receiveShadow
        >
          <boxGeometry args={part.size} />
        </mesh>
      ))}
      {selected ? (
        <mesh scale={1.03} position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.35} />
        </mesh>
      ) : null}
    </group>
  );
}
