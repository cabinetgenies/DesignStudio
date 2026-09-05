import type { PlanTrace, TracedOpening } from "./trace";
import type {
  OpeningDetectionAnalysis,
} from "./opening-detection";

export interface DetectionToOpeningsOptions {
  includeAccepted: boolean;
  includeEdited: boolean;
  allowAcceptedUnknown: boolean;
  duplicateTolerance: number;
}

export interface DetectionToOpeningsResult {
  trace: PlanTrace;
  addedIds: string[];
  candidateToOpeningIds: Record<string, string>;
  skipped: { id: string; reason: string }[];
  duplicates: string[];
  unresolved: string[];
  errors: string[];
  warnings: string[];
  summary: {
    door: number;
    window: number;
    passage: number;
    unknown: number;
  };
}

function resolveWallLength(
  trace: PlanTrace,
  wallId: string,
): number | null {
  const wall = trace.walls[wallId];
  const a = wall && trace.points[wall.startPointId];
  const b = wall && trace.points[wall.endPointId];
  if (!a || !b) return null;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function convertDetectionToOpenings(
  analysis: OpeningDetectionAnalysis,
  trace: PlanTrace,
  options: DetectionToOpeningsOptions,
): DetectionToOpeningsResult {
  const result: DetectionToOpeningsResult = {
    trace: { ...trace, openings: { ...trace.openings } },
    addedIds: [],
    candidateToOpeningIds: {},
    skipped: [],
    duplicates: [],
    unresolved: [],
    errors: [],
    warnings: [],
    summary: { door: 0, window: 0, passage: 0, unknown: 0 },
  };

  const candidates = [...analysis.candidates].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  let counter = 0;

  for (const candidate of candidates) {
    const eligible =
      (candidate.review === "accepted" && options.includeAccepted) ||
      (candidate.review === "edited" && options.includeEdited);
    if (!eligible) {
      result.skipped.push({ id: candidate.id, reason: "Not accepted or edited" });
      continue;
    }
    if (candidate.type === "unknown" && !options.allowAcceptedUnknown) {
      result.skipped.push({ id: candidate.id, reason: "Unknown type not allowed" });
      continue;
    }
    if (
      !Number.isFinite(candidate.width) ||
      !Number.isFinite(candidate.heightM) ||
      candidate.width <= 0 ||
      candidate.heightM <= 0
    ) {
      result.skipped.push({ id: candidate.id, reason: "Invalid dimensions" });
      continue;
    }
    const wallLength = resolveWallLength(trace, candidate.parentWallId);
    if (wallLength === null) {
      result.unresolved.push(candidate.id);
      result.skipped.push({ id: candidate.id, reason: "Unresolved parent wall" });
      continue;
    }
    if (
      candidate.offset < 0 ||
      candidate.offset + candidate.width > wallLength + 1e-6
    ) {
      result.skipped.push({ id: candidate.id, reason: "Outside wall bounds" });
      continue;
    }
    const type: TracedOpening["type"] =
      candidate.type === "unknown" ? "passage" : candidate.type;

    const overlapping = Object.values(result.trace.openings).find((existing) => {
      if (existing.wallId !== candidate.parentWallId) return false;
      const overlap =
        Math.min(candidate.offset + candidate.width, existing.offset + existing.width) -
        Math.max(candidate.offset, existing.offset);
      return overlap > options.duplicateTolerance;
    });
    if (overlapping) {
      result.duplicates.push(candidate.id);
      result.skipped.push({ id: candidate.id, reason: "Duplicate opening" });
      continue;
    }

    counter += 1;
    const id = `oc-trace-${counter}`;
    const opening: TracedOpening = {
      id,
      wallId: candidate.parentWallId,
      type,
      offset: candidate.offset,
      width: candidate.width,
      height: candidate.heightM,
      sillHeight: candidate.sillHeightM,
    };
    result.trace.openings[id] = opening;
    result.addedIds.push(id);
    result.candidateToOpeningIds[candidate.id] = id;
    result.summary[candidate.type === "unknown" ? "unknown" : candidate.type] += 1;
  }

  return result;
}
