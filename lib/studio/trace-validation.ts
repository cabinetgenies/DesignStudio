import {
  traceWallLengthPx,
  type PlanTrace,
} from "./trace";

export interface TraceFinding {
  id: string;
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  entityType: "trace" | "point" | "wall" | "opening";
  entityId?: string;
}

interface ValidateInput {
  trace: PlanTrace;
  calibrationId: string | null;
  activePage: number;
}

export function validateTrace(input: ValidateInput): TraceFinding[] {
  const { trace, calibrationId, activePage } = input;
  const findings: TraceFinding[] = [];

  if (trace.pageNumber !== activePage) {
    findings.push({
      id: "trace-page",
      severity: "error",
      code: "page-mismatch",
      message: "Trace was created on a different PDF page.",
      entityType: "trace",
    });
  }
  if (trace.calibrationId !== calibrationId) {
    findings.push({
      id: "trace-calibration",
      severity: "error",
      code: "stale-calibration",
      message: "Trace calibration is missing or out of date.",
      entityType: "trace",
    });
  }

  for (const point of Object.values(trace.points)) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      findings.push({
        id: `point-${point.id}`,
        severity: "error",
        code: "non-finite-point",
        message: "A trace point has non-finite coordinates.",
        entityType: "point",
        entityId: point.id,
      });
    }
  }

  for (const wall of Object.values(trace.walls)) {
    const length = traceWallLengthPx(trace, wall);
    if (!Number.isFinite(length) || length <= 0.001) {
      findings.push({
        id: `wall-${wall.id}`,
        severity: "error",
        code: "zero-length-wall",
        message: "A wall has zero length.",
        entityType: "wall",
        entityId: wall.id,
      });
    } else if (length < 12) {
      findings.push({
        id: `wall-${wall.id}`,
        severity: "warning",
        code: "short-wall",
        message: "A wall is shorter than the minimum supported length.",
        entityType: "wall",
        entityId: wall.id,
      });
    }
  }

  if (Object.keys(trace.walls).length > 0 && !trace.closed) {
    findings.push({
      id: "trace-open",
      severity: "error",
      code: "open-perimeter",
      message: "The perimeter is not closed.",
      entityType: "trace",
    });
  }

  for (const wall of Object.values(trace.walls)) {
    const length = traceWallLengthPx(trace, wall);
    const openings = Object.values(trace.openings).filter(
      (opening) => opening.wallId === wall.id,
    );
    for (const opening of openings) {
      if (
        !Number.isFinite(opening.width) ||
        !Number.isFinite(opening.height) ||
        !Number.isFinite(opening.sillHeight) ||
        !Number.isFinite(opening.offset)
      ) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "non-finite-opening",
          message: "An opening has non-finite dimensions.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
      if (opening.width <= 0 || opening.height <= 0) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "non-positive-opening",
          message: "An opening has zero or negative dimensions.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
      if (opening.sillHeight < 0) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "negative-sill",
          message: "An opening has a negative sill height.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
      if (opening.height + opening.sillHeight > wall.height) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "opening-exceeds-wall-height",
          message: "An opening plus sill exceeds the wall height.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
      if (
        (opening.type === "door" || opening.type === "passage") &&
        opening.sillHeight > 0
      ) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "warning",
          code: "door-sill",
          message: "A door or passage has a nonzero sill height.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
      if (opening.offset < 0 || opening.width <= 0) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "opening-out-of-bounds",
          message: "An opening is outside its wall bounds.",
          entityType: "opening",
          entityId: opening.id,
        });
      } else if (opening.offset + opening.width > length) {
        findings.push({
          id: `opening-${opening.id}`,
          severity: "error",
          code: "opening-wider-than-wall",
          message: "An opening is wider than its wall.",
          entityType: "opening",
          entityId: opening.id,
        });
      }
    }
    for (let i = 0; i < openings.length; i += 1) {
      for (let j = i + 1; j < openings.length; j += 1) {
        const a = openings[i];
        const b = openings[j];
        const overlap = Math.min(
          a.offset + a.width,
          b.offset + b.width,
        ) - Math.max(a.offset, b.offset);
        if (overlap > 0) {
          findings.push({
            id: `overlap-${a.id}-${b.id}`,
            severity: "error",
            code: "overlapping-openings",
            message: "Two openings overlap on the same wall.",
            entityType: "opening",
            entityId: a.id,
          });
        }
      }
    }
  }

  for (const [key, opening] of Object.entries(trace.openings)) {
    if (!trace.walls[opening.wallId]) {
      findings.push({
        id: `opening-${opening.id}`,
        severity: "error",
        code: "missing-wall",
        message: "An opening references a missing wall.",
        entityType: "opening",
        entityId: opening.id,
      });
    }
    if (!opening.id || opening.id !== key) {
      findings.push({
        id: `opening-${opening.id || "unknown"}`,
        severity: "error",
        code: "malformed-opening-id",
        message: "An opening has a malformed or duplicate ID.",
        entityType: "opening",
        entityId: opening.id,
      });
    }
  }

  return findings;
}
