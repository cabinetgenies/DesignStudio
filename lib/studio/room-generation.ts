import type { PlanCalibration, PlanUnderlayAlignment } from "./plan";
import { roomLayoutBounds, wallLength, type RoomLayout } from "./room";
import type { PlanTrace } from "./trace";

export interface RoomGenerationMetadata {
  generatedAt: number;
  roomId: string;
  traceSignature: string;
  calibrationSignature: string;
  sourceFileName: string | null;
  sourcePage: number;
  underlaySignature: string;
  wallCount: number;
  openingCount: number;
  doorCount: number;
  windowCount: number;
  passageCount: number;
}

export type RoomSyncStatus =
  | "no-room"
  | "matches"
  | "out-of-date"
  | "trace-invalid"
  | "modified"
  | "reviewing";

export interface RoomDifference {
  wallsAdded: number;
  wallsRemoved: number;
  wallsChanged: number;
  openingsAdded: number;
  openingsRemoved: number;
  openingsChanged: number;
  boundsChanged: boolean;
}

export interface RoomImpact {
  label: string;
  detail?: string;
  warning?: boolean;
}

function sortedKeys<T>(record: Record<string, T>): string[] {
  return Object.keys(record).sort((a, b) => a.localeCompare(b));
}

export function traceSignature(trace: PlanTrace | null): string | null {
  if (!trace) {
    return null;
  }
  const points = sortedKeys(trace.points).map((id) => {
    const point = trace.points[id];
    return [id, point.x, point.y];
  });
  const walls = sortedKeys(trace.walls).map((id) => {
    const wall = trace.walls[id];
    return [
      id,
      wall.startPointId,
      wall.endPointId,
      wall.height,
      wall.thickness,
    ];
  });
  const openings = sortedKeys(trace.openings).map((id) => {
    const opening = trace.openings[id];
    return [
      id,
      opening.wallId,
      opening.type,
      opening.offset,
      opening.width,
      opening.height,
      opening.sillHeight,
      opening.name ?? null,
    ];
  });
  return JSON.stringify({
    page: trace.pageNumber,
    rotation: trace.pageRotation,
    calibrationId: trace.calibrationId,
    points,
    walls,
    openings,
    closed: trace.closed,
  });
}

export function calibrationSignature(
  calibration: PlanCalibration | null,
): string | null {
  if (!calibration) {
    return null;
  }
  return JSON.stringify({
    page: calibration.pageNumber,
    ppm: calibration.pixelsPerMeter,
    confirmed: calibration.confirmed,
  });
}

export function underlaySignature(
  underlay: PlanUnderlayAlignment,
): string {
  return JSON.stringify({
    x: underlay.position.x,
    z: underlay.position.z,
    rotation: underlay.rotation,
  });
}

export function computeRoomSyncStatus(input: {
  hasTrace: boolean;
  traceHasErrors: boolean;
  generation: RoomGenerationMetadata | null;
  modifiedAfterGeneration: boolean;
  outOfDate: boolean;
  reviewing: boolean;
}): RoomSyncStatus {
  if (input.reviewing) {
    return "reviewing";
  }
  if (!input.hasTrace) {
    return "no-room";
  }
  if (input.traceHasErrors) {
    return "trace-invalid";
  }
  if (!input.generation) {
    return "no-room";
  }
  if (input.modifiedAfterGeneration) {
    return "modified";
  }
  if (input.outOfDate) {
    return "out-of-date";
  }
  return "matches";
}

function wallsEqual(a: RoomLayout["walls"][number], b: RoomLayout["walls"][number]): boolean {
  return (
    a.start.x === b.start.x &&
    a.start.z === b.start.z &&
    a.end.x === b.end.x &&
    a.end.z === b.end.z &&
    a.height === b.height &&
    a.thickness === b.thickness
  );
}

function openingsEqual(
  a: RoomLayout["walls"][number]["openings"][number],
  b: RoomLayout["walls"][number]["openings"][number],
): boolean {
  return (
    a.type === b.type &&
    a.offset === b.offset &&
    a.width === b.width &&
    a.height === b.height &&
    a.sillHeight === b.sillHeight
  );
}

function boundsEqual(
  a: ReturnType<typeof roomLayoutBounds>,
  b: ReturnType<typeof roomLayoutBounds>,
): boolean {
  const epsilon = 1e-3;
  return (
    Math.abs(a.center[0] - b.center[0]) < epsilon &&
    Math.abs(a.center[1] - b.center[1]) < epsilon &&
    Math.abs(a.center[2] - b.center[2]) < epsilon &&
    Math.abs(a.size[0] - b.size[0]) < epsilon &&
    Math.abs(a.size[1] - b.size[1]) < epsilon &&
    Math.abs(a.size[2] - b.size[2]) < epsilon
  );
}

export function compareRooms(
  current: RoomLayout,
  proposed: RoomLayout,
): RoomDifference {
  const currentWalls = new Map(current.walls.map((wall) => [wall.id, wall]));
  const proposedWalls = new Map(proposed.walls.map((wall) => [wall.id, wall]));

  let wallsAdded = 0;
  let wallsRemoved = 0;
  let wallsChanged = 0;
  for (const [id, wall] of proposedWalls) {
    const currentWall = currentWalls.get(id);
    if (!currentWall) {
      wallsAdded += 1;
    } else if (!wallsEqual(currentWall, wall)) {
      wallsChanged += 1;
    }
  }
  for (const id of currentWalls.keys()) {
    if (!proposedWalls.has(id)) {
      wallsRemoved += 1;
    }
  }

  const currentOpenings = new Map(
    current.walls.flatMap((wall) =>
      wall.openings.map((opening) => [opening.id, opening] as const),
    ),
  );
  const proposedOpenings = new Map(
    proposed.walls.flatMap((wall) =>
      wall.openings.map((opening) => [opening.id, opening] as const),
    ),
  );

  let openingsAdded = 0;
  let openingsRemoved = 0;
  let openingsChanged = 0;
  for (const [id, opening] of proposedOpenings) {
    const currentOpening = currentOpenings.get(id);
    if (!currentOpening) {
      openingsAdded += 1;
    } else if (!openingsEqual(currentOpening, opening)) {
      openingsChanged += 1;
    }
  }
  for (const id of currentOpenings.keys()) {
    if (!proposedOpenings.has(id)) {
      openingsRemoved += 1;
    }
  }

  return {
    wallsAdded,
    wallsRemoved,
    wallsChanged,
    openingsAdded,
    openingsRemoved,
    openingsChanged,
    boundsChanged: !boundsEqual(
      roomLayoutBounds(current),
      roomLayoutBounds(proposed),
    ),
  };
}

export function totalWallLength(room: RoomLayout): number {
  return room.walls.reduce((sum, wall) => sum + wallLength(wall), 0);
}
