import type { RoomWall } from "./room";
import { createCabinetInstance, getCatalogEntry, type CabinetInstance } from "./cabinet";

export type CabinetRunType = "base" | "wall";

export interface CabinetRun {
  id: string;
  name: string;
  wallId: string;
  type: CabinetRunType;
  memberIds: string[];
  startOffset: number;
  occupiedLength: number;
  side: 1 | -1;
  finishZone: "perimeter" | "island";
  mountingHeight: number;
  modified: boolean;
}

export interface CabinetRunSequenceItem {
  id: string;
  catalogId: string;
  cabinetId: string;
}

export interface RunPlacement {
  cabinets: CabinetInstance[];
  occupiedLength: number;
  errors: string[];
  warnings: string[];
}

export function wallLengthM(wall: RoomWall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}

export function wallUnitDirection(wall: RoomWall): { x: number; z: number } {
  const length = wallLengthM(wall);
  return length > 0
    ? { x: (wall.end.x - wall.start.x) / length, z: (wall.end.z - wall.start.z) / length }
    : { x: 1, z: 0 };
}

export function computeRunPlacement(
  wall: RoomWall,
  type: CabinetRunType,
  catalogIds: string[],
  startOffset: number,
  side: 1 | -1,
  mountingHeight: number,
  runId: string,
  finishZone: "perimeter" | "island",
): RunPlacement {
  const errors: string[] = [];
  const warnings: string[] = [];
  const length = wallLengthM(wall);
  if (length <= 0) {
    errors.push("Wall has zero length");
    return { cabinets: [], occupiedLength: 0, errors, warnings };
  }
  if (catalogIds.length === 0) {
    errors.push("Sequence is empty");
    return { cabinets: [], occupiedLength: 0, errors, warnings };
  }

  const dir = wallUnitDirection(wall);
  const nx = -dir.z * side;
  const nz = dir.x * side;

  const cabinets: CabinetInstance[] = [];
  let cursor = startOffset;
  let index = 0;
  for (const catalogId of catalogIds) {
    const entry = getCatalogEntry(catalogId);
    if (!entry) {
      errors.push(`Unknown catalog entry ${catalogId}`);
      continue;
    }
    const compatible =
      type === "base"
        ? entry.category === "base" || entry.category === "drawer-base" || entry.category === "sink-base"
        : entry.category === "wall";
    if (!compatible) {
      errors.push(`${catalogId} is not compatible with ${type} run`);
      continue;
    }
    const id = `${runId}-m${index}`;
    const cabinet = createCabinetInstance(catalogId, id);
    if (!cabinet) {
      errors.push(`Could not create ${catalogId}`);
      continue;
    }
    const centerAlong = cursor + entry.widthM / 2;
    const centerX = wall.start.x + dir.x * centerAlong + nx * (wall.thickness / 2 + entry.depthM / 2);
    const centerZ = wall.start.z + dir.z * centerAlong + nz * (wall.thickness / 2 + entry.depthM / 2);
    cabinet.position = [centerX, type === "wall" ? mountingHeight : 0, centerZ];
    cabinet.rotation = [0, Math.atan2(dir.z, dir.x), 0];
    cabinet.finishZone = finishZone;
    cabinets.push(cabinet);
    cursor += entry.widthM;
    index += 1;
  }

  const occupiedLength = cursor - startOffset;
  if (startOffset < 0) errors.push("Start offset must be nonnegative");
  if (occupiedLength + startOffset > length + 1e-6) {
    errors.push("Sequence exceeds wall length");
  }
  return { cabinets, occupiedLength, errors, warnings };
}

export function validateRunPlacement(result: RunPlacement): string[] {
  return result.errors;
}
