import type { DetectedWallCandidate } from "./wall-detection";
import type { TracePoint, TracedWall } from "./trace";

export type OpeningDetectionStatus =
  | "idle"
  | "analyzing"
  | "complete"
  | "partial"
  | "failed"
  | "stale";

export type OpeningCandidateType = "door" | "window" | "passage" | "unknown";
export type OpeningReviewState = "unreviewed" | "accepted" | "rejected" | "edited";

export interface OpeningEvidence {
  kind: "gap" | "door-leaf" | "window-frame" | "text" | "passage";
  label: string;
  sourceIds: string[];
  confidence: number;
}

export interface DoorHanding {
  hinge: "left" | "right" | "unknown";
  swing: "inward" | "outward" | "unknown";
}

export interface DetectedOpeningCandidate {
  id: string;
  parentWallId: string;
  parentSource: "detected" | "traced";
  center: { x: number; y: number };
  offset: number;
  width: number;
  widthM: number | null;
  type: OpeningCandidateType;
  heightM: number;
  sillHeightM: number;
  confidence: number;
  reasons: string[];
  evidence: OpeningEvidence[];
  review: OpeningReviewState;
  handing: DoorHanding | null;
  original: {
    offset: number;
    width: number;
    type: OpeningCandidateType;
    heightM: number;
    sillHeightM: number;
    confidence: number;
    reasons: string[];
  } | null;
}

export interface OpeningDetectionFinding {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface OpeningDetectionSettings {
  minWidthM: number;
  maxWidthM: number;
  minEndClearanceM: number;
  gapMergeToleranceM: number;
  structuralProximityM: number;
  textProximityM: number;
  minConfidence: number;
  doorDetection: boolean;
  windowDetection: boolean;
  passageDetection: boolean;
  allowUnknown: boolean;
  defaultDoorHeightM: number;
  defaultWindowHeightM: number;
  defaultWindowSillM: number;
  defaultPassageHeightM: number;
}

export const DEFAULT_OPENING_DETECTION_SETTINGS: OpeningDetectionSettings = {
  minWidthM: 0.6,
  maxWidthM: 3.0,
  minEndClearanceM: 0.3,
  gapMergeToleranceM: 0.15,
  structuralProximityM: 0.5,
  textProximityM: 1.0,
  minConfidence: 0.4,
  doorDetection: true,
  windowDetection: true,
  passageDetection: true,
  allowUnknown: true,
  defaultDoorHeightM: 2.032,
  defaultWindowHeightM: 1.2192,
  defaultWindowSillM: 0.9144,
  defaultPassageHeightM: 2.1336,
};

export const OPENING_DETECTION_VERSION = 1;

export interface NormalizedWall {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  length: number;
  direction: { x: number; y: number };
  normal: { x: number; y: number };
  thickness: number;
  height: number;
  sourceKind: "detected" | "traced";
}

export interface OpeningGap {
  offset: number;
  width: number;
  sourceIds: string[];
  coverageBefore: number;
  coverageAfter: number;
  distanceFromEndpoints: number;
  confidence: number;
  rejectionReason: string | null;
}

export interface OpeningDetectionAnalysis {
  id: string;
  sourceFile: string | null;
  pageNumber: number;
  version: number;
  sourceWallSignature: string;
  calibrationSignature: string;
  settingsSignature: string;
  status: OpeningDetectionStatus;
  startedAt: number | null;
  completedAt: number | null;
  candidates: DetectedOpeningCandidate[];
  findings: OpeningDetectionFinding[];
  stale: boolean;
}

export function normalizeDetectedWall(
  candidate: DetectedWallCandidate,
): NormalizedWall | null {
  const length = Math.hypot(
    candidate.centerline.x2 - candidate.centerline.x1,
    candidate.centerline.y2 - candidate.centerline.y1,
  );
  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }
  return {
    id: candidate.id,
    start: { x: candidate.centerline.x1, y: candidate.centerline.y1 },
    end: { x: candidate.centerline.x2, y: candidate.centerline.y2 },
    length,
    direction: {
      x: (candidate.centerline.x2 - candidate.centerline.x1) / length,
      y: (candidate.centerline.y2 - candidate.centerline.y1) / length,
    },
    normal: {
      x: -(candidate.centerline.y2 - candidate.centerline.y1) / length,
      y: (candidate.centerline.x2 - candidate.centerline.x1) / length,
    },
    thickness: candidate.thicknessM ?? 0.15,
    height: candidate.heightM ?? 2.7,
    sourceKind: "detected",
  };
}

export function normalizeTracedWall(
  wall: TracedWall,
  points: Record<string, TracePoint>,
): NormalizedWall | null {
  const start = points[wall.startPointId];
  const end = points[wall.endPointId];
  if (!start || !end) {
    return null;
  }
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length <= 0) {
    return null;
  }
  return {
    id: wall.id,
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
    length,
    direction: { x: (end.x - start.x) / length, y: (end.y - start.y) / length },
    normal: { x: -(end.y - start.y) / length, y: (end.x - start.x) / length },
    thickness: wall.thickness,
    height: wall.height,
    sourceKind: "traced",
  };
}

export function openingSettingsSignature(
  settings: OpeningDetectionSettings,
): string {
  return JSON.stringify(settings);
}

export function validateOpeningCandidate(
  candidate: DetectedOpeningCandidate,
  parentWall: NormalizedWall | null,
  existingCandidates: DetectedOpeningCandidate[],
): OpeningDetectionFinding[] {
  const findings: OpeningDetectionFinding[] = [];
  if (!parentWall) {
    findings.push({ id: `${candidate.id}-wall`, severity: "error", message: "Missing parent wall" });
    return findings;
  }
  if (
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.offset) ||
    !Number.isFinite(candidate.heightM) ||
    !Number.isFinite(candidate.sillHeightM)
  ) {
    findings.push({ id: `${candidate.id}-finite`, severity: "error", message: "Non-finite geometry" });
  }
  if (candidate.width <= 0 || candidate.heightM <= 0) {
    findings.push({ id: `${candidate.id}-positive`, severity: "error", message: "Non-positive dimensions" });
  }
  if (candidate.offset < 0 || candidate.offset + candidate.width > parentWall.length) {
    findings.push({ id: `${candidate.id}-bounds`, severity: "error", message: "Outside wall bounds" });
  }
  if (candidate.sillHeightM < 0) {
    findings.push({ id: `${candidate.id}-sill`, severity: "error", message: "Invalid sill" });
  }
  if (candidate.sillHeightM + candidate.heightM > parentWall.height) {
    findings.push({ id: `${candidate.id}-height`, severity: "error", message: "Height exceeds wall" });
  }
  for (const other of existingCandidates) {
    if (other.id === candidate.id || other.parentWallId !== candidate.parentWallId) {
      continue;
    }
    const overlap =
      Math.min(candidate.offset + candidate.width, other.offset + other.width) -
      Math.max(candidate.offset, other.offset);
    if (overlap > 0) {
      findings.push({ id: `${candidate.id}-overlap`, severity: "warning", message: "Overlaps another candidate" });
    }
  }
  return findings;
}
