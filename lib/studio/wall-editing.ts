import {
  clampOpening,
  wallLength,
  type RoomLayout,
  type RoomWall,
  type WallOpening,
  type WallPoint,
} from "./room";

export type WallEndpointKind = "start" | "end";

export interface WallEndpoint {
  wallId: string;
  point: WallEndpointKind;
  position: WallPoint;
}

export const DEFAULT_ENDPOINT_TOLERANCE = 0.05;

export function distance2d(a: WallPoint, b: WallPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function findConnectedEndpoints(
  room: RoomLayout,
  wallId: string,
  point: WallEndpointKind,
  tolerance: number,
): WallEndpoint[] {
  const anchor = room.walls.find((wall) => wall.id === wallId)?.[point];
  if (!anchor) {
    return [];
  }

  const endpoints: WallEndpoint[] = [];
  for (const wall of room.walls) {
    if (distance2d(wall.start, anchor) <= tolerance) {
      endpoints.push({ wallId: wall.id, point: "start", position: wall.start });
    }
    if (distance2d(wall.end, anchor) <= tolerance) {
      endpoints.push({ wallId: wall.id, point: "end", position: wall.end });
    }
  }
  return endpoints;
}

export function moveEndpoints(
  room: RoomLayout,
  endpoints: WallEndpoint[],
  newPosition: WallPoint,
): RoomLayout {
  const keys = new Set(endpoints.map((e) => `${e.wallId}:${e.point}`));
  const walls = room.walls.map((wall) => {
    let next: RoomWall = wall;
    if (keys.has(`${wall.id}:start`)) {
      next = { ...next, start: { ...newPosition } };
    }
    if (keys.has(`${wall.id}:end`)) {
      next = { ...next, end: { ...newPosition } };
    }
    return clampWallOpenings(next);
  });
  return { ...room, walls };
}

export function openingFits(
  opening: WallOpening,
  length: number,
): boolean {
  return (
    opening.width <= length &&
    opening.offset >= 0 &&
    opening.offset + opening.width <= length
  );
}

export function clampWallOpenings(wall: RoomWall): RoomWall {
  const length = wallLength(wall);
  const openings = wall.openings.map((opening) => {
    if (!openingFits(opening, length)) {
      const clamped = clampOpening(wall, opening);
      return { ...clamped, invalid: true };
    }
    return { ...opening, invalid: false };
  });
  return { ...wall, openings };
}

export function clampAllOpenings(room: RoomLayout): RoomLayout {
  return { ...room, walls: room.walls.map(clampWallOpenings) };
}

export function findNearestEndpoint(
  room: RoomLayout,
  excluded: Set<string>,
  point: WallPoint,
  tolerance: number,
): WallPoint | null {
  let best: WallPoint | null = null;
  let bestDistance = tolerance;
  for (const wall of room.walls) {
    if (!excluded.has(`${wall.id}:start`)) {
      const distance = distance2d(wall.start, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: wall.start.x, z: wall.start.z };
      }
    }
    if (!excluded.has(`${wall.id}:end`)) {
      const distance = distance2d(wall.end, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: wall.end.x, z: wall.end.z };
      }
    }
  }
  return best;
}
