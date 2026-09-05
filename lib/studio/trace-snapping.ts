import type { PlanTrace } from "./trace";

export type TraceSnapType =
  | "point"
  | "close"
  | "horizontal"
  | "vertical"
  | "parallel"
  | "perpendicular"
  | "angle"
  | "grid";

export type TraceSnapGuide =
  | { type: "horizontal"; y: number }
  | { type: "vertical"; x: number }
  | { type: "grid"; x: number; y: number }
  | { type: "axis"; from: { x: number; y: number }; to: { x: number; y: number } };

export interface TraceSnapResult {
  point: { x: number; y: number };
  type: TraceSnapType | null;
  targetId?: string;
  guides: TraceSnapGuide[];
  distancePx?: number;
}

export interface TraceSnapSettings {
  enabled: boolean;
  tolerancePx: number;
  gridEnabled: boolean;
  gridIncrementPx: number;
  angleIncrementDegrees: number;
  parallelPerpendicularEnabled: boolean;
}

export const DEFAULT_TRACE_SNAP_SETTINGS: TraceSnapSettings = {
  enabled: true,
  tolerancePx: 10,
  gridEnabled: true,
  gridIncrementPx: 24,
  angleIncrementDegrees: 15,
  parallelPerpendicularEnabled: true,
};

export interface TraceSnapContext {
  pointer: { x: number; y: number };
  trace: PlanTrace;
  activePointId: string | null;
  firstPointId: string | null;
  zoom: number;
  shift: boolean;
  settings: TraceSnapSettings;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function snapAngle(
  from: { x: number; y: number },
  to: { x: number; y: number },
  incrementDegrees: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    return to;
  }
  const angle = Math.atan2(dy, dx);
  const step = (incrementDegrees * Math.PI) / 180;
  const snapped = Math.round(angle / step) * step;
  return { x: from.x + Math.cos(snapped) * length, y: from.y + Math.sin(snapped) * length };
}

export function snapTracePoint(context: TraceSnapContext): TraceSnapResult {
  const { pointer, trace, activePointId, firstPointId, zoom, shift, settings } =
    context;
  const tolerance = settings.tolerancePx / Math.max(zoom, 0.01);
  const guides: TraceSnapGuide[] = [];

  if (settings.enabled) {
    // Existing point / close snap has top priority.
    let bestPoint: { id: string; x: number; y: number } | null = null;
    let bestDistance = tolerance;
    for (const point of Object.values(trace.points)) {
      if (point.id === activePointId) {
        continue;
      }
      const d = dist(pointer, point);
      if (d < bestDistance) {
        bestDistance = d;
        bestPoint = point;
      }
    }
    if (bestPoint) {
      const isClose = bestPoint.id === firstPointId;
      return {
        point: { x: bestPoint.x, y: bestPoint.y },
        type: isClose ? "close" : "point",
        targetId: bestPoint.id,
        guides,
        distancePx: bestDistance * zoom,
      };
    }
  }

  let result: TraceSnapResult = { point: pointer, type: null, guides };
  const active = activePointId ? trace.points[activePointId] : null;

  if (settings.enabled && active) {
    const dx = pointer.x - active.x;
    const dy = pointer.y - active.y;
    if (Math.abs(dy) < tolerance) {
      result = {
        point: { x: pointer.x, y: active.y },
        type: "horizontal",
        guides: [{ type: "horizontal", y: active.y }],
      };
    } else if (Math.abs(dx) < tolerance) {
      result = {
        point: { x: active.x, y: pointer.y },
        type: "vertical",
        guides: [{ type: "vertical", x: active.x }],
      };
    }

    if (settings.parallelPerpendicularEnabled) {
      const angle = Math.atan2(dy, dx);
      let bestAngle: { type: "parallel" | "perpendicular"; delta: number } | null =
        null;
      for (const wall of Object.values(trace.walls)) {
        const start = trace.points[wall.startPointId];
        const end = trace.points[wall.endPointId];
        if (!start || !end) {
          continue;
        }
        const wallAngle = Math.atan2(end.y - start.y, end.x - start.x);
        for (const [type, target] of [
          ["parallel", wallAngle],
          ["perpendicular", wallAngle + Math.PI / 2],
        ] as const) {
          let delta = Math.abs(angle - target);
          delta = Math.min(delta, Math.abs(delta - Math.PI));
          if (!bestAngle || delta < bestAngle.delta) {
            bestAngle = { type, delta };
          }
        }
      }
      if (bestAngle && bestAngle.delta < 0.12) {
        const snapped = snapAngle(active, pointer, 0.0001);
        result = {
          point: snapped,
          type: bestAngle.type,
          guides,
        };
      }
    }

    if (shift) {
      const snapped = snapAngle(active, pointer, settings.angleIncrementDegrees);
      result = { point: snapped, type: "angle", guides };
    }
  }

  if (settings.enabled && settings.gridEnabled) {
    const grid = settings.gridIncrementPx / Math.max(zoom, 0.01);
    const gx = Math.round(pointer.x / grid) * grid;
    const gz = Math.round(pointer.y / grid) * grid;
    if (Math.abs(gx - pointer.x) < tolerance && Math.abs(gz - pointer.y) < tolerance) {
      result = {
        point: { x: gx, y: gz },
        type: "grid",
        guides: [{ type: "grid", x: gx, y: gz }],
      };
    }
  }

  return result;
}
