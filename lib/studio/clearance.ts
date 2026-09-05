import { wallPlanesFromRoom, type RoomLayout } from "./room";
import type { EditableObjectInfo } from "./editable-objects";
import {
  formatFeetInches,
  type TransformState,
} from "./transforms";

export type ClearanceStatus = "neutral" | "warning" | "conflict";

export interface ClearanceIssue {
  id: string;
  label: string;
  value: string;
  status: ClearanceStatus;
}

export interface ClearanceThresholds {
  wallWarningMeters: number;
  wallConflictMeters: number;
  clearanceWarningMeters: number;
  clearanceConflictMeters: number;
}

export const DEFAULT_CLEARANCE_THRESHOLDS: ClearanceThresholds = {
  wallWarningMeters: 0.6,
  wallConflictMeters: 0.15,
  clearanceWarningMeters: 1.07, // 42"
  clearanceConflictMeters: 0.91, // 36"
};

function currentPosition(
  object: EditableObjectInfo,
  transforms: Record<string, TransformState>,
): [number, number, number] {
  const override = transforms[object.id];
  return override ? override.position : object.originalPosition;
}

function statusFor(value: number, warn: number, conflict: number): ClearanceStatus {
  if (value < conflict) {
    return "conflict";
  }
  if (value < warn) {
    return "warning";
  }
  return "neutral";
}

function minWallGap(
  center: [number, number],
  halfWidth: number,
  halfDepth: number,
  planes: { x: number[]; z: number[] },
): number {
  let gap = Infinity;
  for (const plane of planes.x) {
    gap = Math.min(gap, Math.abs(center[0] - plane) - halfWidth);
  }
  for (const plane of planes.z) {
    gap = Math.min(gap, Math.abs(center[1] - plane) - halfDepth);
  }
  return gap;
}

export function computeClearances(
  objects: EditableObjectInfo[],
  transforms: Record<string, TransformState>,
  room: RoomLayout,
  thresholds: ClearanceThresholds = DEFAULT_CLEARANCE_THRESHOLDS,
): ClearanceIssue[] {
  const issues: ClearanceIssue[] = [];
  const planes = wallPlanesFromRoom(room);
  const roomMinX = Math.min(...planes.x);
  const roomMaxX = Math.max(...planes.x);
  const roomMinZ = Math.min(...planes.z);
  const roomMaxZ = Math.max(...planes.z);

  for (const object of objects) {
    if (transforms[object.id]?.hidden) {
      continue;
    }
    const position = currentPosition(object, transforms);
    const halfWidth = object.size[0] / 2;
    const halfDepth = object.size[2] / 2;
    const minX = position[0] - halfWidth;
    const maxX = position[0] + halfWidth;
    const minZ = position[2] - halfDepth;
    const maxZ = position[2] + halfDepth;

    if (
      minX < roomMinX ||
      maxX > roomMaxX ||
      minZ < roomMinZ ||
      maxZ > roomMaxZ
    ) {
      issues.push({
        id: `${object.id}-outside`,
        label: `${object.name} outside room`,
        value: "Outside",
        status: "conflict",
      });
    }

    const wallGap = minWallGap(
      [position[0], position[2]],
      halfWidth,
      halfDepth,
      planes,
    );
    if (Number.isFinite(wallGap) && wallGap < thresholds.wallWarningMeters) {
      issues.push({
        id: `${object.id}-wall`,
        label: `${object.name} to wall`,
        value: formatFeetInches(wallGap),
        status: statusFor(
          wallGap,
          thresholds.wallConflictMeters,
          thresholds.wallWarningMeters,
        ),
      });
    }

    for (const other of objects) {
      if (other.id === object.id || transforms[other.id]?.hidden) {
        continue;
      }
      const otherPosition = currentPosition(other, transforms);
      const otherHalfW = other.size[0] / 2;
      const otherHalfD = other.size[2] / 2;
      const overlapX =
        Math.min(maxX, otherPosition[0] + otherHalfW) -
        Math.max(minX, otherPosition[0] - otherHalfW);
      const overlapZ =
        Math.min(maxZ, otherPosition[2] + otherHalfD) -
        Math.max(minZ, otherPosition[2] - otherHalfD);
      if (overlapX > 0 && overlapZ > 0) {
        issues.push({
          id: `${object.id}-overlap-${other.id}`,
          label: `${object.name} overlaps ${other.name}`,
          value: "Overlap",
          status: "conflict",
        });
      }
    }
  }

  return issues;
}
