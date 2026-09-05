"use client";

import { Html, Line } from "@react-three/drei";
import { memo } from "react";
import type { SnapResult } from "@/lib/studio/geometry-snapping";

const KIND_COLOR: Record<string, string> = {
  opening: "#d946ef",
  object: "#3b82f6",
  wall: "#10b981",
  centerline: "#f59e0b",
  grid: "#71717a",
};

function SnapGuides({
  snap,
  guidePoint,
  presenting,
}: {
  snap: SnapResult | null;
  guidePoint: [number, number, number] | null;
  presenting: boolean;
}) {
  if (presenting || !snap?.match || !guidePoint) {
    return null;
  }

  const match = snap.match;
  const y = guidePoint[1];
  const color = KIND_COLOR[match.kind] ?? "#71717a";

  let labelPoint: [number, number, number] = guidePoint;
  const lines: { points: [number, number, number][]; color: string; width: number }[] = [];

  if (match.guide) {
    const source = match.guide.source;
    const target = match.guide.target;
    lines.push({
      points: [
        [source.a[0], y, source.a[1]],
        [source.b[0], y, source.b[1]],
      ],
      color,
      width: 2,
    });
    lines.push({
      points: [
        [target.a[0], y, target.a[1]],
        [target.b[0], y, target.b[1]],
      ],
      color,
      width: 3,
    });
    labelPoint = [
      (source.a[0] + source.b[0]) / 2,
      y + 0.15,
      (source.a[1] + source.b[1]) / 2,
    ];
  }

  return (
    <group name="snap-guides" userData={{ guide: true }}>
      {lines.map((line, index) => (
        <Line
          key={index}
          points={line.points}
          color={line.color}
          lineWidth={line.width}
        />
      ))}
      <Html position={labelPoint} center style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 shadow-sm ring-1 ring-zinc-200">
          {match.label}
        </div>
      </Html>
    </group>
  );
}

export default memo(SnapGuides);
