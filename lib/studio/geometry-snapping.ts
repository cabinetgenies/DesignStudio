import { wallDirection, type RoomLayout } from "./room";
import type { EditableObjectInfo } from "./editable-objects";
import {
  inchesToMeters,
  snapToStep,
  type SnapConfig,
  type TransformState,
} from "./transforms";

export type SnapKind = "opening" | "object" | "wall" | "centerline" | "grid";

export interface XZEdge {
  a: [number, number];
  b: [number, number];
}

export interface XZFootprint {
  corners: [number, number][];
  edges: XZEdge[];
  center: [number, number];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SnapMatch {
  kind: SnapKind;
  label: string;
  correction: { x: number; z: number };
  distance: number;
  guide?: { source: XZEdge; target: XZEdge };
}

export interface SnapResult {
  correction: { x: number; z: number };
  match: SnapMatch | null;
  status: string;
}

export interface SnapTargets {
  walls: XZEdge[];
  objects: XZFootprint[];
  openings: XZEdge[];
}

function objectPosition(
  object: EditableObjectInfo,
  transforms: Record<string, TransformState>,
): [number, number, number] {
  const override = transforms[object.id];
  return override ? override.position : object.originalPosition;
}

export function makeFootprint(
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  rotationY: number,
): XZFootprint {
  const halfW = width / 2;
  const halfD = depth / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const local: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];
  const corners = local.map(
    ([x, z]) => [centerX + x * cos - z * sin, centerZ + x * sin + z * cos] as [
      number,
      number,
    ],
  );
  return footprintFromCorners(corners);
}

export function convexHullFootprint(points: [number, number][]): XZFootprint {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) {
    return footprintFromCorners(sorted);
  }
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: number[][] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return footprintFromCorners([...lower, ...upper] as [number, number][]);
}

export function footprintFromCorners(corners: [number, number][]): XZFootprint {
  const edges: XZEdge[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    edges.push({ a: corners[i], b: corners[(i + 1) % corners.length] });
  }
  const minX = Math.min(...corners.map((c) => c[0]));
  const maxX = Math.max(...corners.map((c) => c[0]));
  const minZ = Math.min(...corners.map((c) => c[1]));
  const maxZ = Math.max(...corners.map((c) => c[1]));
  return {
    corners,
    edges,
    center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

export function footprintOf(
  object: EditableObjectInfo,
  transforms: Record<string, TransformState>,
): XZFootprint {
  const position = objectPosition(object, transforms);
  const rotation =
    transforms[object.id]?.rotation?.[1] ?? object.originalRotation[1];
  return makeFootprint(
    position[0],
    position[2],
    object.size[0],
    object.size[2],
    rotation,
  );
}

export function selectionFootprint(
  objects: EditableObjectInfo[],
  transforms: Record<string, TransformState>,
): XZFootprint {
  const points = objects
    .filter((object) => !transforms[object.id]?.hidden)
    .flatMap((object) => footprintOf(object, transforms).corners);
  return convexHullFootprint(points);
}

export function buildSnapTargets(
  room: RoomLayout,
  objects: EditableObjectInfo[],
  transforms: Record<string, TransformState>,
  selectedIds: string[],
): SnapTargets {
  const selected = new Set(selectedIds);
  const footprints: XZFootprint[] = [];
  const openings: XZEdge[] = [];

  for (const object of objects) {
    if (transforms[object.id]?.hidden || selected.has(object.id)) {
      continue;
    }
    footprints.push(footprintOf(object, transforms));
  }

  for (const wall of room.walls) {
    const direction = wallDirection(wall);
    for (const opening of wall.openings) {
      const startX = wall.start.x + direction.x * opening.offset;
      const startZ = wall.start.z + direction.y * opening.offset;
      const endX = wall.start.x + direction.x * (opening.offset + opening.width);
      const endZ = wall.start.z + direction.y * (opening.offset + opening.width);
      openings.push({ a: [startX, startZ], b: [endX, endZ] });
    }
  }

  const walls: XZEdge[] = room.walls.map((wall) => ({
    a: [wall.start.x, wall.start.z],
    b: [wall.end.x, wall.end.z],
  }));

  return { walls, objects: footprints, openings };
}

interface Candidate {
  kind: SnapKind;
  label: string;
  priority: number;
  correction: { x: number; z: number };
  distance: number;
  guide?: { source: XZEdge; target: XZEdge };
}

function sub(a: number[], b: number[]) {
  return [a[0] - b[0], a[1] - b[1]];
}

function dot(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1];
}

function edgeToEdge(
  source: XZEdge,
  target: XZEdge,
  angleTolerance: number,
): { correction: { x: number; z: number }; distance: number } | null {
  const sd = sub(source.b, source.a);
  const td = sub(target.b, target.a);
  const sdLen = Math.hypot(sd[0], sd[1]);
  const tdLen = Math.hypot(td[0], td[1]);
  if (sdLen < 1e-6 || tdLen < 1e-6) {
    return null;
  }
  const sdx = sd[0] / sdLen;
  const sdz = sd[1] / sdLen;
  const tdx = td[0] / tdLen;
  const tdz = td[1] / tdLen;
  const cross = sdx * tdz - sdz * tdx;
  if (Math.abs(cross) > angleTolerance) {
    return null;
  }
  // Unit normal of the target edge.
  const nx = -tdz;
  const nz = tdx;
  const offset = sub(source.a, target.a);
  const signedDistance = dot(offset, [nx, nz]);
  return {
    correction: { x: -nx * signedDistance, z: -nz * signedDistance },
    distance: Math.abs(signedDistance),
  };
}

export function computeSnap(
  footprint: XZFootprint,
  targets: SnapTargets,
  config: SnapConfig,
): SnapResult {
  const tolerance = config.geometryTolerance;
  const angleTolerance = 0.2;
  const candidates: Candidate[] = [];

  function add(candidate: Candidate) {
    if (
      candidate.correction.x === 0 &&
      candidate.correction.z === 0
    ) {
      return;
    }
    if (candidate.distance <= tolerance) {
      candidates.push(candidate);
    }
  }

  function considerEdges(
    kind: SnapKind,
    label: string,
    priority: number,
    targetEdges: XZEdge[],
  ) {
    for (const sourceEdge of footprint.edges) {
      for (const targetEdge of targetEdges) {
        const result = edgeToEdge(sourceEdge, targetEdge, angleTolerance);
        if (result) {
          add({
            kind,
            label,
            priority,
            correction: result.correction,
            distance: result.distance,
            guide: { source: sourceEdge, target: targetEdge },
          });
        }
      }
    }
  }

  if (config.openingSnap) {
    considerEdges("opening", "Opening edge snapped", 0, targets.openings);
  }
  if (config.objectSnap) {
    considerEdges(
      "object",
      "Cabinet edge snapped",
      1,
      targets.objects.flatMap((o) => o.edges),
    );
  }
  if (config.wallSnap) {
    considerEdges("wall", "Wall snapped", 2, targets.walls);
  }

  if (config.centerlineSnap) {
    for (const object of targets.objects) {
      add({
        kind: "centerline",
        label: "Centerline snapped",
        priority: 3,
        correction: { x: object.center[0] - footprint.center[0], z: 0 },
        distance: Math.abs(object.center[0] - footprint.center[0]),
      });
      add({
        kind: "centerline",
        label: "Centerline snapped",
        priority: 3,
        correction: { x: 0, z: object.center[1] - footprint.center[1] },
        distance: Math.abs(object.center[1] - footprint.center[1]),
      });
    }
  }

  if (config.enabled) {
    const step = inchesToMeters(config.translationInches);
    for (const corner of footprint.corners) {
      add({
        kind: "grid",
        label: `Grid: ${config.translationInches}"`,
        priority: 4,
        correction: { x: snapToStep(corner[0], step) - corner[0], z: 0 },
        distance: Math.abs(snapToStep(corner[0], step) - corner[0]),
      });
      add({
        kind: "grid",
        label: `Grid: ${config.translationInches}"`,
        priority: 4,
        correction: { x: 0, z: snapToStep(corner[1], step) - corner[1] },
        distance: Math.abs(snapToStep(corner[1], step) - corner[1]),
      });
    }
  }

  candidates.sort(
    (a, b) => a.distance - b.distance || a.priority - b.priority,
  );
  const match = candidates[0] ?? null;
  return {
    correction: match ? match.correction : { x: 0, z: 0 },
    match: match
      ? {
          kind: match.kind,
          label: match.label,
          correction: match.correction,
          distance: match.distance,
          guide: match.guide,
        }
      : null,
    status: match
      ? match.label
      : config.enabled
        ? `Grid: ${config.translationInches}"`
        : "Snap off",
  };
}
