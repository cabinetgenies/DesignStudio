"use client";

import type { PlanTrace } from "@/lib/studio/trace";
import type { TraceSnapResult } from "@/lib/studio/trace-snapping";
import { canonicalToWorkspace } from "@/lib/studio/plan-coordinates";

function TraceSnapGuides({
  snap,
  trace,
  pageMeta,
  pageRotation,
  renderScale,
  width,
  height,
}: {
  snap: TraceSnapResult | null;
  trace: PlanTrace | null;
  pageMeta: { widthPt: number; heightPt: number } | null;
  pageRotation: number;
  renderScale: number;
  width: number;
  height: number;
}) {
  if (!snap || snap.type === null || !pageMeta) {
    return null;
  }

  const to = (point: { x: number; y: number }) =>
    canonicalToWorkspace(
      point,
      pageMeta.widthPt,
      pageMeta.heightPt,
      pageRotation,
      renderScale,
    );

  const snapPoint = to(snap.point);
  const color = snap.type === "close" ? "#16a34a" : "#2563eb";

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
    >
      {snap.guides.map((guide, index) => {
        if (guide.type === "horizontal") {
          const y = to({ x: 0, y: guide.y }).y;
          return (
            <line key={index} x1={0} x2={width} y1={y} y2={y} stroke={color} strokeDasharray="4 4" strokeWidth={1} />
          );
        }
        if (guide.type === "vertical") {
          const x = to({ x: guide.x, y: 0 }).x;
          return (
            <line key={index} x1={x} x2={x} y1={0} y2={height} stroke={color} strokeDasharray="4 4" strokeWidth={1} />
          );
        }
        if (guide.type === "grid") {
          const p = to({ x: guide.x, y: guide.y });
          return (
            <g key={index}>
              <line x1={p.x - 6} x2={p.x + 6} y1={p.y} y2={p.y} stroke={color} strokeWidth={1} />
              <line x1={p.x} x2={p.x} y1={p.y - 6} y2={p.y + 6} stroke={color} strokeWidth={1} />
            </g>
          );
        }
        if (guide.type === "axis") {
          const a = to(guide.from);
          const b = to(guide.to);
          return (
            <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeDasharray="4 4" strokeWidth={1} />
          );
        }
        return null;
      })}

      {(snap.type === "point" || snap.type === "close") && snap.targetId && trace?.points[snap.targetId] ? (
        <circle
          cx={snapPoint.x}
          cy={snapPoint.y}
          r={snap.type === "close" ? 9 : 7}
          fill={snap.type === "close" ? color : "none"}
          stroke={color}
          strokeWidth={2}
        />
      ) : null}

      <text
        x={snapPoint.x + 12}
        y={snapPoint.y - 12}
        fontSize={12}
        fill={color}
      >
        {snap.type}
      </text>
    </svg>
  );
}

export default TraceSnapGuides;
