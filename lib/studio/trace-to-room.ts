import { canonicalToRotated } from "./plan-coordinates";
import type { PlanCalibration, PlanUnderlayAlignment } from "./plan";
import type {
  RoomLayout,
  RoomWall,
  WallOpening,
  WallPoint,
} from "./room";
import type { PlanTrace } from "./trace";

export function traceToRoomLayout(
  trace: PlanTrace,
  calibration: PlanCalibration,
  underlayAlignment: PlanUnderlayAlignment,
): RoomLayout {
  const ppm = calibration.pixelsPerMeter;
  const widthM = trace.pageWidthPt / ppm;
  const heightM = trace.pageHeightPt / ppm;
  const cos = Math.cos(underlayAlignment.rotation);
  const sin = Math.sin(underlayAlignment.rotation);

  function toWorld(point: { x: number; y: number }): WallPoint {
    const mx = point.x / ppm;
    const my = point.y / ppm;
    const rotated = canonicalToRotated(
      { x: mx, y: my },
      widthM,
      heightM,
      trace.pageRotation,
    );
    const dx = rotated.x - widthM / 2;
    const dz = heightM / 2 - rotated.y;
    return {
      x: underlayAlignment.position.x + dx * cos + dz * sin,
      z: underlayAlignment.position.z - dx * sin + dz * cos,
    };
  }

  const walls: RoomWall[] = Object.values(trace.walls).map((wall) => {
    const start = trace.points[wall.startPointId];
    const end = trace.points[wall.endPointId];
    const openings: WallOpening[] = Object.values(trace.openings)
      .filter((opening) => opening.wallId === wall.id)
      .map((opening) => ({
        id: opening.id,
        wallId: wall.id,
        type: opening.type,
        name: opening.name,
        offset: opening.offset / ppm,
        width: opening.width / ppm,
        height: opening.height,
        sillHeight: opening.sillHeight,
      }));
    return {
      id: wall.id,
      start: start ? toWorld(start) : { x: 0, z: 0 },
      end: end ? toWorld(end) : { x: 1, z: 0 },
      height: wall.height,
      thickness: wall.thickness,
      openings,
    };
  });

  return { walls, floorY: 0 };
}

export function tracedWallCount(trace: PlanTrace): number {
  return Object.keys(trace.walls).length;
}

export function tracedOpeningCount(trace: PlanTrace): number {
  return Object.keys(trace.openings).length;
}
