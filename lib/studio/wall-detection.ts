export type WallDetectionSource = "raster-wall-detection";

export type WallReviewState = "unreviewed" | "accepted" | "rejected" | "edited";

export type WallDetectionStatus =
  | "not-analyzed"
  | "analyzing"
  | "complete"
  | "partial"
  | "failed"
  | "cancelled"
  | "stale";

export interface WallDetectionSettings {
  minLengthPx: number;
  minThicknessPx: number;
  maxThicknessPx: number;
  angleToleranceDeg: number;
  gapBridgePx: number;
  minConfidence: number;
  minVotes: number;
  snapAngleDeg: number;
}

export const DEFAULT_WALL_DETECTION_SETTINGS: WallDetectionSettings = {
  minLengthPx: 40,
  minThicknessPx: 12,
  maxThicknessPx: 160,
  angleToleranceDeg: 4,
  gapBridgePx: 18,
  minConfidence: 0.45,
  minVotes: 60,
  snapAngleDeg: 2,
};

export interface DetectedLineSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthPx: number;
  angleDeg: number;
  strength: number;
  source: WallDetectionSource;
  raw: boolean;
}

export interface DetectedWallCandidate {
  id: string;
  centerline: { x1: number; y1: number; x2: number; y2: number };
  edgeLineIds: string[];
  thicknessPx: number;
  thicknessM: number | null;
  heightM: number | null;
  lengthPx: number;
  lengthM: number | null;
  angleDeg: number;
  confidence: number;
  reasons: string[];
  review: WallReviewState;
  source: WallDetectionSource;
  original: {
    centerline: { x1: number; y1: number; x2: number; y2: number };
    thicknessPx: number;
    thicknessM: number | null;
    heightM: number | null;
    angleDeg: number;
    lengthPx: number;
    lengthM: number | null;
    confidence: number;
    reasons: string[];
  } | null;
}

export interface WallDetectionFinding {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface WallDetectionAnalysis {
  id: string;
  sourceFile: string | null;
  pageNumber: number;
  crop: { x: number; y: number; width: number; height: number } | null;
  rasterScale: number;
  preset: string;
  useTextAware: boolean;
  version: number;
  settingsSignature: string;
  status: WallDetectionStatus;
  startedAt: number | null;
  completedAt: number | null;
  stale: boolean;
  rawLines: DetectedLineSegment[];
  cleanedLines: DetectedLineSegment[];
  candidates: DetectedWallCandidate[];
  findings: WallDetectionFinding[];
}

export const WALL_DETECTION_VERSION = 1;

export function wallDetectionSettingsSignature(
  settings: WallDetectionSettings,
): string {
  return JSON.stringify(settings);
}

export function segmentAngle(x1: number, y1: number, x2: number, y2: number): number {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const normalized = ((angle % 180) + 180) % 180;
  return normalized > 90 ? normalized - 180 : normalized;
}

export function segmentLength(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function normalizeSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x1: number; y1: number; x2: number; y2: number } {
  if (x1 < x2 || (x1 === x2 && y1 < y2)) {
    return { x1, y1, x2, y2 };
  }
  return { x1: x2, y1: y2, x2: x1, y2: y1 };
}

function angleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b) % 180;
  if (diff > 90) {
    diff = 180 - diff;
  }
  return diff;
}

export function collinearDistance(
  a: DetectedLineSegment,
  b: DetectedLineSegment,
): number {
  const angle = (a.angleDeg * Math.PI) / 180;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const d1 = nx * (b.x1 - a.x1) + ny * (b.y1 - a.y1);
  const d2 = nx * (b.x2 - a.x1) + ny * (b.y2 - a.y1);
  return (Math.abs(d1) + Math.abs(d2)) / 2;
}

export function segmentOverlapRatio(
  a: DetectedLineSegment,
  b: DetectedLineSegment,
): number {
  const dir = {
    x: Math.cos((a.angleDeg * Math.PI) / 180),
    y: Math.sin((a.angleDeg * Math.PI) / 180),
  };
  const project = (seg: DetectedLineSegment) => {
    const p1 = seg.x1 * dir.x + seg.y1 * dir.y;
    const p2 = seg.x2 * dir.x + seg.y2 * dir.y;
    return [Math.min(p1, p2), Math.max(p1, p2)] as const;
  };
  const [a0, a1] = project(a);
  const [b0, b1] = project(b);
  const overlap = Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const minLength = Math.min(a.lengthPx, b.lengthPx);
  return minLength > 0 ? overlap / minLength : 0;
}

export function mergeCollinearSegments(
  lines: DetectedLineSegment[],
  angleToleranceDeg: number,
  gapBridgePx: number,
): DetectedLineSegment[] {
  const merged: DetectedLineSegment[] = [];
  const used = new Set<string>();

  for (let i = 0; i < lines.length; i += 1) {
    if (used.has(lines[i].id)) {
      continue;
    }
    const group: DetectedLineSegment[] = [lines[i]];
    used.add(lines[i].id);
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < lines.length; j += 1) {
        if (used.has(lines[j].id)) {
          continue;
        }
        const representative = group[0];
        if (
          angleDiff(representative.angleDeg, lines[j].angleDeg) <=
            angleToleranceDeg &&
          collinearDistance(representative, lines[j]) <= gapBridgePx &&
          segmentOverlapRatio(representative, lines[j]) > -gapBridgePx / Math.max(representative.lengthPx, 1)
        ) {
          group.push(lines[j]);
          used.add(lines[j].id);
          changed = true;
        }
      }
    }

    const xs: number[] = [];
    const ys: number[] = [];
    for (const seg of group) {
      xs.push(seg.x1, seg.x2);
      ys.push(seg.y1, seg.y2);
    }
    const angle = group[0].angleDeg;
    const rad = (angle * Math.PI) / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    const projected = group
      .map((seg) => {
        const p1 = seg.x1 * dir.x + seg.y1 * dir.y;
        const p2 = seg.x2 * dir.x + seg.y2 * dir.y;
        return { seg, a: Math.min(p1, p2), b: Math.max(p1, p2) };
      })
      .sort((p, q) => p.a - q.a);
    const start = projected[0];
    const end = projected[projected.length - 1];
    const x1 = start.a * dir.x;
    const y1 = start.a * dir.y;
    const x2 = end.b * dir.x;
    const y2 = end.b * dir.y;
    const length = segmentLength(x1, y1, x2, y2);
    if (length > 0) {
      merged.push({
        id: `merged-${merged.length}`,
        x1,
        y1,
        x2,
        y2,
        lengthPx: length,
        angleDeg: angle,
        strength: Math.max(...group.map((seg) => seg.strength)),
        source: group[0].source,
        raw: false,
      });
    }
  }

  return merged;
}

export function pairParallelLines(
  lines: DetectedLineSegment[],
  settings: WallDetectionSettings,
): DetectedWallCandidate[] {
  const candidates: DetectedWallCandidate[] = [];
  const used = new Set<string>();

  for (let i = 0; i < lines.length; i += 1) {
    const a = lines[i];
    if (used.has(a.id)) {
      continue;
    }
    let best: { line: DetectedLineSegment; distance: number; overlap: number } | null = null;
    for (let j = i + 1; j < lines.length; j += 1) {
      const b = lines[j];
      if (used.has(b.id)) {
        continue;
      }
      if (angleDiff(a.angleDeg, b.angleDeg) > settings.angleToleranceDeg) {
        continue;
      }
      const rad = (a.angleDeg * Math.PI) / 180;
      const nx = -Math.sin(rad);
      const ny = Math.cos(rad);
      const distance =
        Math.abs(nx * (b.x1 - a.x1) + ny * (b.y1 - a.y1));
      if (distance < settings.minThicknessPx || distance > settings.maxThicknessPx) {
        continue;
      }
      const overlap = segmentOverlapRatio(a, b);
      if (overlap < 0.35) {
        continue;
      }
      if (!best || overlap > best.overlap) {
        best = { line: b, distance, overlap };
      }
    }

    if (!best) {
      continue;
    }
    used.add(a.id);
    used.add(best.line.id);

    const thickness = best.distance;
    const cx1 = (a.x1 + best.line.x1) / 2;
    const cy1 = (a.y1 + best.line.y1) / 2;
    const cx2 = (a.x2 + best.line.x2) / 2;
    const cy2 = (a.y2 + best.line.y2) / 2;
    const length = segmentLength(cx1, cy1, cx2, cy2);
    const confidence = scoreWallConfidence({
      parallelism: 1,
      overlap: best.overlap,
      length,
      thickness,
      settings,
      textOverlap: false,
      singleLine: false,
    });
    candidates.push({
      id: `wall-${candidates.length}`,
      centerline: normalizeSegment(cx1, cy1, cx2, cy2),
      edgeLineIds: [a.id, best.line.id],
      thicknessPx: thickness,
      thicknessM: null,
      heightM: null,
      lengthPx: length,
      lengthM: null,
      angleDeg: a.angleDeg,
      confidence: confidence.score,
      reasons: confidence.reasons,
      review: "unreviewed",
      source: "raster-wall-detection",
      original: null,
    });
  }

  return candidates;
}

export interface ConfidenceInput {
  parallelism: number;
  overlap: number;
  length: number;
  thickness: number;
  settings: WallDetectionSettings;
  textOverlap: boolean;
  singleLine: boolean;
}

export function scoreWallConfidence(input: ConfidenceInput): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0.35;
  if (input.parallelism > 0.9) {
    score += 0.15;
    reasons.push("Strong parallel edges");
  }
  if (input.overlap > 0.7) {
    score += 0.15;
    reasons.push("Strong segment overlap");
  }
  const thicknessPlausible =
    input.thickness >= input.settings.minThicknessPx &&
    input.thickness <= input.settings.maxThicknessPx;
  if (thicknessPlausible) {
    score += 0.1;
    reasons.push("Plausible wall thickness");
  }
  if (input.length < input.settings.minLengthPx * 2) {
    score -= 0.1;
    reasons.push("Short isolated segment");
  }
  if (input.textOverlap) {
    score -= 0.2;
    reasons.push("Overlaps dimension text");
  }
  if (input.singleLine) {
    score -= 0.15;
    reasons.push("Single-line inference");
  }
  return { score: Math.max(0, Math.min(1, score)), reasons };
}

function candidateEndpoints(candidate: DetectedWallCandidate) {
  const { x1, y1, x2, y2 } = candidate.centerline;
  return { x1, y1, x2, y2 };
}

export function splitWallCandidate(
  candidate: DetectedWallCandidate,
  position = 0.5,
): { a: DetectedWallCandidate; b: DetectedWallCandidate } | null {
  const t = Math.min(0.9, Math.max(0.1, position));
  const { x1, y1, x2, y2 } = candidateEndpoints(candidate);
  const mx = x1 + (x2 - x1) * t;
  const my = y1 + (y2 - y1) * t;
  const base = {
    edgeLineIds: candidate.edgeLineIds,
    thicknessPx: candidate.thicknessPx,
    thicknessM: candidate.thicknessM,
    heightM: candidate.heightM,
    angleDeg: candidate.angleDeg,
    confidence: candidate.confidence,
    reasons: candidate.reasons,
    source: candidate.source,
  };
  const a: DetectedWallCandidate = {
    ...base,
    id: `${candidate.id}-a`,
    centerline: { x1, y1, x2: mx, y2: my },
    lengthPx: segmentLength(x1, y1, mx, my),
    lengthM: candidate.lengthM ? candidate.lengthM * t : null,
    review: candidate.review,
    original: null,
  };
  const b: DetectedWallCandidate = {
    ...base,
    id: `${candidate.id}-b`,
    centerline: { x1: mx, y1: my, x2, y2 },
    lengthPx: segmentLength(mx, my, x2, y2),
    lengthM: candidate.lengthM ? candidate.lengthM * (1 - t) : null,
    review: candidate.review,
    original: null,
  };
  return { a, b };
}

export interface MergeResult {
  candidate: DetectedWallCandidate;
  error: null;
}

export function mergeWallCandidates(
  a: DetectedWallCandidate,
  b: DetectedWallCandidate,
  settings: WallDetectionSettings,
): { candidate: DetectedWallCandidate } | { error: string } {
  const angleDiff = Math.abs(a.angleDeg - b.angleDeg) % 180;
  const angleDelta = angleDiff > 90 ? 180 - angleDiff : angleDiff;
  if (angleDelta > settings.angleToleranceDeg) {
    return { error: "Candidates are not collinear." };
  }
  const thicknessDelta = Math.abs(a.thicknessPx - b.thicknessPx);
  if (thicknessDelta > Math.max(a.thicknessPx, b.thicknessPx) * 0.5) {
    return { error: "Candidates have incompatible thickness." };
  }
  const xs = [a.centerline.x1, a.centerline.x2, b.centerline.x1, b.centerline.x2];
  const ys = [a.centerline.y1, a.centerline.y2, b.centerline.y1, b.centerline.y2];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const combinedLength = segmentLength(minX, minY, maxX, maxY);
  const gap =
    Math.max(a.lengthPx, b.lengthPx) - combinedLength;
  if (gap > settings.gapBridgePx * 2) {
    return { error: "Candidates are too far apart." };
  }
  const candidate: DetectedWallCandidate = {
    id: `merged-${a.id}-${b.id}`,
    centerline: normalizeSegment(minX, minY, maxX, maxY),
    edgeLineIds: Array.from(new Set([...a.edgeLineIds, ...b.edgeLineIds])),
    thicknessPx: (a.thicknessPx + b.thicknessPx) / 2,
    thicknessM: a.thicknessM && b.thicknessM ? (a.thicknessM + b.thicknessM) / 2 : null,
    heightM: a.heightM ?? b.heightM,
    lengthPx: combinedLength,
    lengthM: a.lengthM && b.lengthM ? Math.max(a.lengthM, b.lengthM) : null,
    angleDeg: (a.angleDeg + b.angleDeg) / 2,
    confidence: Math.min(a.confidence, b.confidence),
    reasons: Array.from(new Set([...a.reasons, ...b.reasons])),
    review: "edited",
    source: "raster-wall-detection",
    original: {
      centerline: normalizeSegment(minX, minY, maxX, maxY),
      thicknessPx: (a.thicknessPx + b.thicknessPx) / 2,
      thicknessM: a.thicknessM && b.thicknessM ? (a.thicknessM + b.thicknessM) / 2 : null,
      heightM: a.heightM ?? b.heightM,
      angleDeg: (a.angleDeg + b.angleDeg) / 2,
      lengthPx: combinedLength,
      lengthM: a.lengthM && b.lengthM ? Math.max(a.lengthM, b.lengthM) : null,
      confidence: Math.min(a.confidence, b.confidence),
      reasons: Array.from(new Set([...a.reasons, ...b.reasons])),
    },
  };
  return { candidate };
}

export function inferSingleLineWall(
  line: DetectedLineSegment,
  thicknessPx: number,
  lengthM: number | null,
): DetectedWallCandidate {
  return {
    id: `single-${line.id}`,
    centerline: normalizeSegment(line.x1, line.y1, line.x2, line.y2),
    edgeLineIds: [line.id],
    thicknessPx,
    thicknessM: null,
    heightM: null,
    lengthPx: line.lengthPx,
    lengthM,
    angleDeg: line.angleDeg,
    confidence: 0.5,
    reasons: ["Single-line inference", "User-reviewed"],
    review: "accepted",
    source: "raster-wall-detection",
    original: {
      centerline: normalizeSegment(line.x1, line.y1, line.x2, line.y2),
      thicknessPx,
      thicknessM: null,
      heightM: null,
      angleDeg: line.angleDeg,
      lengthPx: line.lengthPx,
      lengthM,
      confidence: 0.5,
      reasons: ["Single-line inference", "User-reviewed"],
    },
  };
}

export interface WallCandidatePatch {
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  length?: number;
  angle?: number;
  thicknessPx?: number;
  heightM?: number;
}

export function updateWallCandidateGeometry(
  candidate: DetectedWallCandidate,
  patch: WallCandidatePatch,
  pixelsPerMeter: number | null,
): DetectedWallCandidate {
  let { x1, y1, x2, y2 } = candidate.centerline;
  if (patch.start) {
    x1 = patch.start.x;
    y1 = patch.start.y;
  }
  if (patch.end) {
    x2 = patch.end.x;
    y2 = patch.end.y;
  }
  if (patch.length != null && patch.length > 0) {
    const rad = (candidate.angleDeg * Math.PI) / 180;
    x2 = x1 + Math.cos(rad) * patch.length;
    y2 = y1 + Math.sin(rad) * patch.length;
  }
  if (patch.angle != null) {
    const rad = (patch.angle * Math.PI) / 180;
    const len = Math.hypot(x2 - x1, y2 - y1);
    x2 = x1 + Math.cos(rad) * len;
    y2 = y1 + Math.sin(rad) * len;
  }
  const lengthPx = Math.hypot(x2 - x1, y2 - y1);
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const thicknessPx = patch.thicknessPx ?? candidate.thicknessPx;
  const heightM = patch.heightM ?? candidate.heightM;
  return {
    ...candidate,
    centerline: normalizeSegment(x1, y1, x2, y2),
    lengthPx,
    angleDeg,
    thicknessPx,
    thicknessM: pixelsPerMeter ? thicknessPx / pixelsPerMeter : candidate.thicknessM,
    lengthM: pixelsPerMeter ? lengthPx / pixelsPerMeter : candidate.lengthM,
    heightM,
    review: "edited",
  };
}
