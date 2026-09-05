import {
  wallLength,
  wallDirection,
  wallPlanesFromRoom,
  type RoomLayout,
} from "./room";
import type { EditableObjectInfo } from "./editable-objects";
import {
  formatFeetInches,
  type TransformState,
} from "./transforms";
import {
  computeClearances,
  type ClearanceThresholds,
} from "./clearance";

export type DimensionStatus = "neutral" | "warning" | "conflict";

export interface DimensionItem {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  status?: DimensionStatus;
}

interface Point {
  x: number;
  z: number;
}

function currentPosition(
  object: EditableObjectInfo,
  transforms: Record<string, TransformState>,
): [number, number, number] {
  const override = transforms[object.id];
  return override ? override.position : object.originalPosition;
}

export function computeRoomDimensions(room: RoomLayout): DimensionItem[] {
  const items: DimensionItem[] = [];
  const y = room.floorY + 0.02;

  for (const wall of room.walls) {
    const length = wallLength(wall);
    if (length <= 0.001) {
      continue;
    }
    const offset = wall.thickness / 2 + 0.4;
    const direction = wallDirection(wall);
    const normal = { x: -direction.y, z: direction.x };
    const start: Point = {
      x: wall.start.x + normal.x * offset,
      z: wall.start.z + normal.z * offset,
    };
    const end: Point = {
      x: wall.end.x + normal.x * offset,
      z: wall.end.z + normal.z * offset,
    };
    items.push({
      id: `${wall.id}-length`,
      start: [start.x, y, start.z],
      end: [end.x, y, end.z],
      label: formatFeetInches(length),
    });

    for (const opening of wall.openings) {
      const openingOffset = wall.thickness / 2 + 0.5;
      const oStart: Point = {
        x: wall.start.x + direction.x * opening.offset + normal.x * openingOffset,
        z: wall.start.z + direction.y * opening.offset + normal.z * openingOffset,
      };
      const oEnd: Point = {
        x: oStart.x + direction.x * opening.width,
        z: oStart.z + direction.y * opening.width,
      };
      items.push({
        id: `${opening.id}-width`,
        start: [oStart.x, y, oStart.z],
        end: [oEnd.x, y, oEnd.z],
        label: formatFeetInches(opening.width),
      });

      const toEnd = length - opening.offset - opening.width;
      items.push({
        id: `${opening.id}-offset-start`,
        start: [start.x, y, start.z],
        end: [oStart.x, y, oStart.z],
        label: formatFeetInches(opening.offset),
      });
      items.push({
        id: `${opening.id}-offset-end`,
        start: [oEnd.x, y, oEnd.z],
        end: [end.x, y, end.z],
        label: formatFeetInches(toEnd),
      });
    }
  }

  return items;
}

export function computeSelectionDimensions(opts: {
  room: RoomLayout;
  objects: EditableObjectInfo[];
  selected: EditableObjectInfo[];
  transforms: Record<string, TransformState>;
  thresholds: ClearanceThresholds;
}): DimensionItem[] {
  const { room, selected, transforms, thresholds } = opts;
  const items: DimensionItem[] = [];
  const y = room.floorY + 0.02;
  const planes = wallPlanesFromRoom(room);

  const selectedPositions = selected
    .filter((o) => !transforms[o.id]?.hidden)
    .map((o) => ({ object: o, pos: currentPosition(o, transforms) }));

  // Object size (width and depth on the floor)
  for (const { object, pos } of selectedPositions) {
    const w = object.size[0];
    const d = object.size[2];
    items.push({
      id: `${object.id}-width`,
      start: [pos[0] - w / 2, y, pos[2]],
      end: [pos[0] + w / 2, y, pos[2]],
      label: formatFeetInches(w),
    });
    items.push({
      id: `${object.id}-depth`,
      start: [pos[0], y, pos[2] - d / 2],
      end: [pos[0], y, pos[2] + d / 2],
      label: formatFeetInches(d),
    });
  }

  // Object-to-nearest-wall
  for (const { object, pos } of selectedPositions) {
    const halfW = object.size[0] / 2;
    const halfD = object.size[2] / 2;
    let best: { point: [number, number, number]; distance: number } | null = null;
    for (const plane of planes.x) {
      const distance = Math.abs(pos[0] - plane) - halfW;
      if (!best || distance < best.distance) {
        best = { point: [plane, y, pos[2]], distance };
      }
    }
    for (const plane of planes.z) {
      const distance = Math.abs(pos[2] - plane) - halfD;
      if (!best || distance < best.distance) {
        best = { point: [pos[0], y, plane], distance };
      }
    }
    if (best) {
      items.push({
        id: `${object.id}-to-wall`,
        start: [pos[0], y, pos[2]],
        end: best.point,
        label: formatFeetInches(best.distance),
        status:
          best.distance < thresholds.clearanceConflictMeters
            ? "conflict"
            : best.distance < thresholds.clearanceWarningMeters
              ? "warning"
              : "neutral",
      });
    }
  }

  // Distance between two selected objects
  if (selectedPositions.length === 2) {
    const [a, b] = selectedPositions;
    const distance = Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]);
    items.push({
      id: `distance-${a.object.id}-${b.object.id}`,
      start: [a.pos[0], y, a.pos[2]],
      end: [b.pos[0], y, b.pos[2]],
      label: formatFeetInches(distance),
    });
  }

  return items;
}

export function computeIslandClearanceDimensions(opts: {
  objects: EditableObjectInfo[];
  transforms: Record<string, TransformState>;
  islandZone: (id: string) => boolean;
  perimeterZone: (id: string) => boolean;
  thresholds: ClearanceThresholds;
  y: number;
}): DimensionItem[] {
  const { objects, transforms, islandZone, perimeterZone, thresholds, y } = opts;
  const islands = objects.filter((o) => islandZone(o.id) && !transforms[o.id]?.hidden);
  const perimeters = objects.filter((o) => perimeterZone(o.id) && !transforms[o.id]?.hidden);
  const items: DimensionItem[] = [];

  for (const island of islands) {
    const islandPos = currentPosition(island, transforms);
    const rotation = transforms[island.id]?.rotation?.[1] ?? island.originalRotation[1];
    const halfW = island.size[0] / 2;
    const halfD = island.size[2] / 2;

    const corners = islandCorners(islandPos, halfW, halfD, rotation);
    const sides: { key: string; dir: [number, number]; corners: [number, number][] }[] = [
      { key: "front", dir: [0, 1], corners: corners.slice(0, 2) },
      { key: "back", dir: [0, -1], corners: corners.slice(2, 4) },
      { key: "left", dir: [-1, 0], corners: [corners[0], corners[3]] },
      { key: "right", dir: [1, 0], corners: [corners[1], corners[2]] },
    ];

    for (const side of sides) {
      let best: { distance: number; object: EditableObjectInfo } | null = null;
      for (const perimeter of perimeters) {
        const pPos = currentPosition(perimeter, transforms);
        const pHalfW = perimeter.size[0] / 2;
        const pHalfD = perimeter.size[2] / 2;
        const distance = islandToBoxDistance(
          islandPos,
          halfW,
          halfD,
          rotation,
          pPos,
          pHalfW,
          pHalfD,
        );
        if (!best || distance < best.distance) {
          best = { distance, object: perimeter };
        }
      }
      if (best) {
        const status =
          best.distance < thresholds.clearanceConflictMeters
            ? "conflict"
            : best.distance < thresholds.clearanceWarningMeters
              ? "warning"
              : "neutral";
        const center = side.corners.reduce(
          (acc, c) => ({ x: acc.x + c[0] / 2, z: acc.z + c[1] / 2 }),
          { x: 0, z: 0 },
        );
        items.push({
          id: `${island.id}-${side.key}`,
          start: [center.x, y, center.z],
          end: [center.x + side.dir[0] * best.distance, y, center.z + side.dir[1] * best.distance],
          label: `${side.key}: ${formatFeetInches(best.distance)} (min ${formatFeetInches(thresholds.clearanceWarningMeters)})`,
          status,
        });
      }
    }
  }

  return items;
}

function islandCorners(
  center: [number, number, number],
  halfW: number,
  halfD: number,
  rotation: number,
): [number, number][] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const local: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];
  return local.map(([x, z]) => [
    center[0] + x * cos - z * sin,
    center[2] + x * sin + z * cos,
  ]);
}

function islandToBoxDistance(
  islandPos: [number, number, number],
  islandHalfW: number,
  islandHalfD: number,
  rotation: number,
  boxPos: [number, number, number],
  boxHalfW: number,
  boxHalfD: number,
): number {
  const corners = islandCorners(islandPos, islandHalfW, islandHalfD, rotation);
  let min = Infinity;
  for (const [x, z] of corners) {
    const dx = Math.max(Math.abs(x - boxPos[0]) - boxHalfW, 0);
    const dz = Math.max(Math.abs(z - boxPos[2]) - boxHalfD, 0);
    min = Math.min(min, Math.hypot(dx, dz));
  }
  return min;
}

export { computeClearances };
