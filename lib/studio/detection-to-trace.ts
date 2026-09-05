import {
  emptyTrace,
  type PlanTrace,
  type TracePoint,
  type TracedWall,
} from "./trace";
import type { WallDetectionAnalysis } from "./wall-detection";

export interface DetectionToTraceOptions {
  mode: "replace" | "append";
  minConfidence: number;
  endpointTolerance: number;
  defaultWallHeight: number;
  defaultWallThickness: number;
}

export interface DetectionToTraceResult {
  trace: PlanTrace;
  summary: {
    eligibleCount: number;
    skippedCount: number;
    wallCount: number;
    pointCount: number;
    endpointJoins: number;
    duplicateWallsSkipped: number;
    automaticSplits: number;
  };
  candidateToWallIds: Record<string, string>;
  findings: { severity: "info" | "warning" | "error"; message: string }[];
  skippedCandidateIds: string[];
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function convertDetectionToTrace(
  detection: WallDetectionAnalysis,
  existingTrace: PlanTrace | null,
  options: DetectionToTraceOptions,
): DetectionToTraceResult {
  const findings: DetectionToTraceResult["findings"] = [];
  const skippedCandidateIds: string[] = [];
  const candidateToWallIds: Record<string, string> = {};

  const candidates = [...detection.candidates].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const eligible = candidates.filter((candidate) => {
    const reviewed =
      candidate.review === "accepted" || candidate.review === "edited";
    const geometryFinite = Number.isFinite(
      candidate.centerline.x1 +
        candidate.centerline.y1 +
        candidate.centerline.x2 +
        candidate.centerline.y2,
    );
    const lengthOk = candidate.lengthPx > 0;
    const confidenceOk = candidate.confidence >= options.minConfidence;
    if (!reviewed || !geometryFinite || !lengthOk || !confidenceOk) {
      skippedCandidateIds.push(candidate.id);
    }
    return reviewed && geometryFinite && lengthOk && confidenceOk;
  });

  const points: Record<string, TracePoint> = {};
  const basePoints =
    options.mode === "append" && existingTrace
      ? [...Object.values(existingTrace.points)]
      : [];
  let pointCounter = 0;

  function internPoint(p: { x: number; y: number }): string {
    for (const existing of basePoints) {
      if (distance(existing, p) <= options.endpointTolerance) {
        if (!points[existing.id]) {
          points[existing.id] = existing;
        }
        return existing.id;
      }
    }
    for (const point of Object.values(points)) {
      if (distance(point, p) <= options.endpointTolerance) {
        return point.id;
      }
    }
    pointCounter += 1;
    const id = `dp-${pointCounter}`;
    points[id] = { id, x: p.x, y: p.y };
    return id;
  }

  const walls: TracedWall[] =
    options.mode === "append" && existingTrace
      ? [...Object.values(existingTrace.walls)]
      : [];
  const existingSignatures = new Set(
    walls.map((wall) =>
      [wall.startPointId, wall.endPointId].sort().join("::"),
    ),
  );
  let duplicateWallsSkipped = 0;

  for (const candidate of eligible) {
    const startId = internPoint({
      x: candidate.centerline.x1,
      y: candidate.centerline.y1,
    });
    const endId = internPoint({
      x: candidate.centerline.x2,
      y: candidate.centerline.y2,
    });
    if (startId === endId) {
      skippedCandidateIds.push(candidate.id);
      continue;
    }
    const signature = [startId, endId].sort().join("::");
    if (existingSignatures.has(signature)) {
      duplicateWallsSkipped += 1;
      skippedCandidateIds.push(candidate.id);
      continue;
    }
    existingSignatures.add(signature);
    pointCounter += 1;
    const wallId = `dw-${pointCounter}`;
    candidateToWallIds[candidate.id] = wallId;
    walls.push({
      id: wallId,
      startPointId: startId,
      endPointId: endId,
      height: candidate.heightM ?? options.defaultWallHeight,
      thickness: candidate.thicknessM ?? options.defaultWallThickness,
    });
  }

  const joined = Math.max(
    0,
    eligible.length * 2 - Object.keys(points).length,
  );

  const trace: PlanTrace = {
    ...(options.mode === "append" && existingTrace
      ? existingTrace
      : emptyTrace(
          detection.pageNumber,
          `detection-${detection.id}`,
        )),
    points,
    walls: Object.fromEntries(walls.map((wall) => [wall.id, wall])),
    openings:
      options.mode === "append" && existingTrace
        ? existingTrace.openings
        : {},
    closed: false,
  };

  return {
    trace,
    summary: {
      eligibleCount: eligible.length,
      skippedCount: skippedCandidateIds.length,
      wallCount: walls.length,
      pointCount: Object.keys(points).length,
      endpointJoins: joined,
      duplicateWallsSkipped,
      automaticSplits: 0,
    },
    candidateToWallIds,
    findings,
    skippedCandidateIds,
  };
}
