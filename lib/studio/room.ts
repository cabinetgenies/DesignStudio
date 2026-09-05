import * as THREE from "three";
import type { Bounds } from "./space-planning";

export interface WallPoint {
  x: number;
  z: number;
}

export type OpeningType = "door" | "window" | "passage";

export interface WallOpening {
  id: string;
  wallId: string;
  type: OpeningType;
  name?: string;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  invalid?: boolean;
}

export interface RoomWall {
  id: string;
  start: WallPoint;
  end: WallPoint;
  height: number;
  thickness: number;
  openings: WallOpening[];
}

export interface RoomLayout {
  walls: RoomWall[];
  floorY: number;
}

export interface WallSegment {
  id: string;
  wallId: string;
  kind: "solid" | "lintel" | "sill";
  center: [number, number, number];
  size: [number, number, number];
  rotationY: number;
}

export interface OpeningBox {
  id: string;
  wallId: string;
  openingId: string;
  type: OpeningType;
  center: [number, number, number];
  size: [number, number, number];
  rotationY: number;
}

const DEFAULT_WALL_HEIGHT = 2.7;
const DEFAULT_WALL_THICKNESS = 0.15;

export const DEFAULT_ROOM_SIZE = {
  widthMeters: 3.6576, // 12'
  depthMeters: 4.8768, // 16'
};

export function createRoomLayout(
  widthMeters = DEFAULT_ROOM_SIZE.widthMeters,
  depthMeters = DEFAULT_ROOM_SIZE.depthMeters,
): RoomLayout {
  const halfWidth = widthMeters / 2;
  const halfDepth = depthMeters / 2;
  const corners: WallPoint[] = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];

  const walls: RoomWall[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    const start = corners[i];
    const end = corners[(i + 1) % corners.length];
    walls.push({
      id: `wall-${i + 1}`,
      start,
      end,
      height: DEFAULT_WALL_HEIGHT,
      thickness: DEFAULT_WALL_THICKNESS,
      openings: [],
    });
  }

  // Default 36" door on the front wall and 72" window on the left wall.
  walls[2].openings = [
    {
      id: "door-1",
      wallId: walls[2].id,
      type: "door",
      offset: 1.2,
      width: 0.9144,
      height: 2.03,
      sillHeight: 0,
    },
  ];
  walls[3].openings = [
    {
      id: "window-1",
      wallId: walls[3].id,
      type: "window",
      offset: 1.2,
      width: 1.8288,
      height: 1.07,
      sillHeight: 0.9144,
    },
  ];

  return { walls, floorY: 0 };
}

export function wallLength(wall: RoomWall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}

export function wallDirection(wall: RoomWall): THREE.Vector2 {
  const direction = new THREE.Vector2(
    wall.end.x - wall.start.x,
    wall.end.z - wall.start.z,
  );
  const length = direction.length();
  return length > 0 ? direction.divideScalar(length) : new THREE.Vector2(1, 0);
}

export function clampOpening(wall: RoomWall, opening: WallOpening): WallOpening {
  const length = wallLength(wall);
  const width = Math.min(Math.max(opening.width, 0.2), length);
  const offset = Math.min(Math.max(opening.offset, 0), length - width);
  return { ...opening, width, offset };
}

export function buildWallGeometry(
  wall: RoomWall,
): { segments: WallSegment[]; openings: OpeningBox[] } {
  const length = wallLength(wall);
  const direction = wallDirection(wall);
  const rotationY = Math.atan2(direction.y, direction.x);
  const thickness = Math.max(wall.thickness, 0.04);
  const height = Math.max(wall.height, 0.2);
  const start = new THREE.Vector3(wall.start.x, 0, wall.start.z);

  const segments: WallSegment[] = [];
  const openingBoxes: OpeningBox[] = [];

  const sorted = [...wall.openings].sort((a, b) => a.offset - b.offset);
  let cursor = 0;
  let index = 0;

  function pushSegment(
    from: number,
    to: number,
    kind: WallSegment["kind"],
    y: number,
    segHeight: number,
  ): void {
    const segLength = to - from;
    if (segLength <= 0.001) {
      return;
    }
    const centerOffset = (from + to) / 2;
    const center = start
      .clone()
      .add(
        new THREE.Vector3(direction.x, 0, direction.y).multiplyScalar(
          centerOffset,
        ),
      );
    center.y = y;
    segments.push({
      id: `${wall.id}-seg-${index}`,
      wallId: wall.id,
      kind,
      center: [center.x, center.y, center.z],
      size: [segLength, segHeight, thickness],
      rotationY,
    });
    index += 1;
  }

  for (const opening of sorted) {
    const clamped = clampOpening(wall, opening);
    pushSegment(cursor, clamped.offset, "solid", height / 2, height);

    const openingCenterOffset = clamped.offset + clamped.width / 2;
    const openingCenter = start
      .clone()
      .add(
        new THREE.Vector3(direction.x, 0, direction.y).multiplyScalar(
          openingCenterOffset,
        ),
      );

    if (clamped.type === "window") {
      const sill = Math.max(clamped.sillHeight, 0);
      const top = Math.min(sill + clamped.height, height);
      pushSegment(cursor, clamped.offset, "solid", height / 2, height);
      // lintel above window
      pushSegment(
        clamped.offset,
        clamped.offset + clamped.width,
        "lintel",
        (top + height) / 2,
        Math.max(height - top, 0),
      );
      // sill below window
      pushSegment(
        clamped.offset,
        clamped.offset + clamped.width,
        "sill",
        sill / 2,
        Math.max(sill, 0),
      );
      openingCenter.y = (sill + top) / 2;
      openingBoxes.push({
        id: `${wall.id}-opening-${clamped.id}`,
        wallId: wall.id,
        openingId: clamped.id,
        type: "window",
        center: [openingCenter.x, openingCenter.y, openingCenter.z],
        size: [clamped.width, Math.max(top - sill, 0.02), thickness + 0.02],
        rotationY,
      });
    } else {
      const openingHeight = Math.min(clamped.height, height);
      pushSegment(
        clamped.offset,
        clamped.offset + clamped.width,
        "lintel",
        (openingHeight + height) / 2,
        Math.max(height - openingHeight, 0),
      );
      openingCenter.y = openingHeight / 2;
      openingBoxes.push({
        id: `${wall.id}-opening-${clamped.id}`,
        wallId: wall.id,
        openingId: clamped.id,
        type: clamped.type,
        center: [openingCenter.x, openingCenter.y, openingCenter.z],
        size: [clamped.width, openingHeight, thickness + 0.02],
        rotationY,
      });
    }

    cursor = clamped.offset + clamped.width;
  }

  pushSegment(cursor, length, "solid", height / 2, height);

  return { segments, openings: openingBoxes };
}

export function roomLayoutBounds(room: RoomLayout): Bounds {
  if (room.walls.length === 0) {
    return { center: [0, room.floorY, 0], size: [4, 2.7, 4] };
  }
  const box = new THREE.Box3();
  for (const wall of room.walls) {
    box.expandByPoint(new THREE.Vector3(wall.start.x, room.floorY, wall.start.z));
    box.expandByPoint(new THREE.Vector3(wall.end.x, wall.height, wall.end.z));
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
  };
}

export function wallPlanesFromRoom(room: RoomLayout): { x: number[]; z: number[] } {
  const x: number[] = [];
  const z: number[] = [];
  for (const wall of room.walls) {
    const dx = Math.abs(wall.end.x - wall.start.x);
    const dz = Math.abs(wall.end.z - wall.start.z);
    if (dx < dz) {
      x.push(wall.start.x);
      x.push(wall.end.x);
    } else {
      z.push(wall.start.z);
      z.push(wall.end.z);
    }
  }
  return { x, z };
}
