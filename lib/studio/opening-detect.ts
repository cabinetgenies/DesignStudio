import {
  DEFAULT_OPENING_DETECTION_SETTINGS,
  OPENING_DETECTION_VERSION,
  normalizeDetectedWall,
  normalizeTracedWall,
  openingSettingsSignature,
  validateOpeningCandidate,
  type DetectedOpeningCandidate,
  type NormalizedWall,
  type OpeningDetectionAnalysis,
  type OpeningDetectionFinding,
  type OpeningDetectionSettings,
  type OpeningEvidence,
  type OpeningGap,
} from "./opening-detection";
import type { DetectedLineSegment, DetectedWallCandidate } from "./wall-detection";
import type { PlanTextItem } from "./plan-analysis";
import type { TracePoint, TracedWall } from "./trace";

export interface OpeningDetectionCoreInput {
  detectedWalls?: DetectedWallCandidate[];
  tracedWalls?: { wall: TracedWall; points: Record<string, TracePoint> }[];
  structuralSegments: DetectedLineSegment[];
  textItems: PlanTextItem[];
  pixelsPerMeter: number | null;
  settings?: OpeningDetectionSettings;
  sourceFile: string | null;
  pageNumber: number;
}

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

export function detectWallGaps(
  wall: NormalizedWall,
  segments: DetectedLineSegment[],
  settings: OpeningDetectionSettings,
  pixelsPerMeter: number | null,
): OpeningGap[] {
  const ppm = pixelsPerMeter ?? 100;
  const proximity = settings.structuralProximityM * ppm;
  const minWidth = settings.minWidthM * ppm;
  const maxWidth = settings.maxWidthM * ppm;
  const endClearance = settings.minEndClearanceM * ppm;
  const intervals: { a: number; b: number; id: string }[] = [];

  for (const seg of segments) {
    const dx1 = seg.x1 - wall.start.x;
    const dy1 = seg.y1 - wall.start.y;
    const dx2 = seg.x2 - wall.start.x;
    const dy2 = seg.y2 - wall.start.y;
    const d1 = Math.abs(dot(dx1, dy1, wall.normal.x, wall.normal.y));
    const d2 = Math.abs(dot(dx2, dy2, wall.normal.x, wall.normal.y));
    if (Math.min(d1, d2) > proximity) {
      continue;
    }
    const t1 = dot(dx1, dy1, wall.direction.x, wall.direction.y);
    const t2 = dot(dx2, dy2, wall.direction.x, wall.direction.y);
    intervals.push({
      a: Math.min(t1, t2),
      b: Math.max(t1, t2),
      id: seg.id,
    });
  }

  intervals.sort((x, y) => x.a - y.a);
  const merged: { a: number; b: number; ids: string[] }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.a <= last.b + settings.gapMergeToleranceM * ppm) {
      last.b = Math.max(last.b, interval.b);
      last.ids.push(interval.id);
    } else {
      merged.push({ a: interval.a, b: interval.b, ids: [interval.id] });
    }
  }

  const gaps: OpeningGap[] = [];
  let cursor = endClearance;
  for (const interval of merged) {
    if (interval.a > cursor + settings.gapMergeToleranceM * ppm) {
      const offset = cursor;
      const width = interval.a - cursor;
      if (width >= minWidth && width <= maxWidth && interval.a < wall.length - endClearance) {
        gaps.push({
          offset,
          width,
          sourceIds: [],
          coverageBefore: cursor,
          coverageAfter: wall.length - interval.a,
          distanceFromEndpoints: Math.min(offset, wall.length - (offset + width)),
          confidence: 0.65,
          rejectionReason: null,
        });
      }
    }
    cursor = Math.max(cursor, interval.b);
  }

  return gaps;
}

function collectTextEvidence(
  wall: NormalizedWall,
  gap: OpeningGap,
  textItems: PlanTextItem[],
  settings: OpeningDetectionSettings,
  pixelsPerMeter: number | null,
): OpeningEvidence[] {
  const ppm = pixelsPerMeter ?? 100;
  const centerOffset = gap.offset + gap.width / 2;
  const center = {
    x: wall.start.x + wall.direction.x * centerOffset,
    y: wall.start.y + wall.direction.y * centerOffset,
  };
  const evidence: OpeningEvidence[] = [];
  for (const item of textItems) {
    const ix = item.x + item.width / 2;
    const iy = item.y + item.height / 2;
    const distance = Math.hypot(ix - center.x, iy - center.y);
    if (distance > settings.textProximityM * ppm) {
      continue;
    }
    const lower = item.normalized;
    if (/door|\bdr\b/.test(lower)) {
      evidence.push({ kind: "text", label: "Door label nearby", sourceIds: [item.id], confidence: 0.8 });
    } else if (/window|wdw|win/.test(lower)) {
      evidence.push({ kind: "text", label: "Window label nearby", sourceIds: [item.id], confidence: 0.8 });
    } else if (/passage|opening|c\.?o\.?/.test(lower)) {
      evidence.push({ kind: "text", label: "Passage label nearby", sourceIds: [item.id], confidence: 0.75 });
    }
  }
  return evidence;
}

function classifyOpening(
  evidence: OpeningEvidence[],
  settings: OpeningDetectionSettings,
): { type: DetectedOpeningCandidate["type"]; reasons: string[] } {
  const hasGap = evidence.some((e) => e.kind === "gap");
  const doorText = evidence.some((e) => e.kind === "text" && e.label.startsWith("Door"));
  const windowText = evidence.some((e) => e.kind === "text" && e.label.startsWith("Window"));
  const passageText = evidence.some((e) => e.kind === "text" && e.label.startsWith("Passage"));
  const doorLeaf = evidence.some((e) => e.kind === "door-leaf");
  const windowFrame = evidence.some((e) => e.kind === "window-frame");
  const reasons: string[] = [];
  if (hasGap) reasons.push("Wall gap detected");

  if (settings.doorDetection && hasGap && (doorLeaf || doorText)) {
    if (doorLeaf) reasons.push("Door leaf detected");
    return { type: "door", reasons };
  }
  if (settings.windowDetection && hasGap && (windowFrame || windowText)) {
    if (windowFrame) reasons.push("Window frame detected");
    return { type: "window", reasons };
  }
  if (settings.passageDetection && hasGap && passageText) {
    return { type: "passage", reasons };
  }
  if (settings.allowUnknown && hasGap) {
    return { type: "unknown", reasons };
  }
  return { type: "unknown", reasons };
}

function scoreOpening(
  gap: OpeningGap,
  evidence: OpeningEvidence[],
  type: DetectedOpeningCandidate["type"],
  calibrated: boolean,
): { confidence: number; reasons: string[] } {
  let confidence = gap.confidence;
  const reasons: string[] = [];
  if (gap.coverageBefore > 0 && gap.coverageAfter > 0) {
    confidence += 0.15;
    reasons.push("Coverage on both sides");
  }
  if (gap.distanceFromEndpoints < 1) {
    confidence -= 0.1;
    reasons.push("Near wall endpoint");
  }
  if (evidence.some((e) => e.kind === "door-leaf" || e.kind === "window-frame")) {
    confidence += 0.15;
  }
  if (evidence.some((e) => e.kind === "text")) {
    confidence += 0.1;
  }
  if (!calibrated) {
    confidence -= 0.05;
    reasons.push("Uncalibrated plan");
  }
  if (type === "unknown") {
    confidence -= 0.1;
    reasons.push("Ambiguous classification");
  }
  return { confidence: Math.max(0, Math.min(1, confidence)), reasons };
}

function deduplicate(
  candidates: DetectedOpeningCandidate[],
): DetectedOpeningCandidate[] {
  const result: DetectedOpeningCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => a.id.localeCompare(b.id))) {
    const dup = result.find(
      (existing) =>
        existing.parentWallId === candidate.parentWallId &&
        Math.abs(existing.offset - candidate.offset) < 0.5 &&
        Math.abs(existing.width - candidate.width) < 0.5,
    );
    if (!dup) {
      result.push(candidate);
    }
  }
  return result;
}

export function runOpeningDetectionCore(
  input: OpeningDetectionCoreInput,
): OpeningDetectionAnalysis {
  const settings = input.settings ?? DEFAULT_OPENING_DETECTION_SETTINGS;
  const walls: NormalizedWall[] = [];
  const findings: OpeningDetectionFinding[] = [];

  for (const candidate of input.detectedWalls ?? []) {
    if (candidate.review !== "accepted" && candidate.review !== "edited") {
      continue;
    }
    const wall = normalizeDetectedWall(candidate);
    if (wall) {
      walls.push(wall);
    } else {
      findings.push({ id: `wall-${candidate.id}`, severity: "error", message: "Invalid wall" });
    }
  }
  for (const traced of input.tracedWalls ?? []) {
    const wall = normalizeTracedWall(traced.wall, traced.points);
    if (wall) {
      walls.push(wall);
    } else {
      findings.push({ id: `wall-${traced.wall.id}`, severity: "error", message: "Invalid wall" });
    }
  }

  if (!input.pixelsPerMeter) {
    findings.push({ id: "uncalibrated", severity: "warning", message: "Uncalibrated plan; widths are canonical units" });
  }

  let candidates: DetectedOpeningCandidate[] = [];
  for (const wall of walls) {
    const gaps = detectWallGaps(wall, input.structuralSegments, settings, input.pixelsPerMeter);
    for (const gap of gaps) {
      const textEvidence = collectTextEvidence(wall, gap, input.textItems, settings, input.pixelsPerMeter);
      const evidence: OpeningEvidence[] = [
        { kind: "gap", label: "Wall gap", sourceIds: gap.sourceIds, confidence: gap.confidence },
        ...textEvidence,
      ];
      const classification = classifyOpening(evidence, settings);
      const score = scoreOpening(gap, evidence, classification.type, Boolean(input.pixelsPerMeter));
      const heightM =
        classification.type === "door"
          ? settings.defaultDoorHeightM
          : classification.type === "window"
            ? settings.defaultWindowHeightM
            : classification.type === "passage"
              ? settings.defaultPassageHeightM
              : settings.defaultDoorHeightM;
      const sillHeightM =
        classification.type === "window" ? settings.defaultWindowSillM : 0;
      candidates.push({
        id: `oc-${wall.id}-${candidates.length}`,
        parentWallId: wall.id,
        parentSource: wall.sourceKind,
        center: {
          x: wall.start.x + wall.direction.x * (gap.offset + gap.width / 2),
          y: wall.start.y + wall.direction.y * (gap.offset + gap.width / 2),
        },
        offset: gap.offset,
        width: gap.width,
        widthM: input.pixelsPerMeter ? gap.width / input.pixelsPerMeter : null,
        type: classification.type,
        heightM,
        sillHeightM,
        confidence: score.confidence,
        reasons: [...classification.reasons, ...score.reasons],
        evidence,
        review: "unreviewed",
        handing: null,
        original: null,
      });
    }
  }

  candidates = deduplicate(candidates);
  for (const candidate of candidates) {
    const parent = walls.find((wall) => wall.id === candidate.parentWallId) ?? null;
    findings.push(...validateOpeningCandidate(candidate, parent, candidates));
  }

  return {
    id: `opening-${input.pageNumber}`,
    sourceFile: input.sourceFile,
    pageNumber: input.pageNumber,
    version: OPENING_DETECTION_VERSION,
    sourceWallSignature: JSON.stringify(walls.map((wall) => wall.id).sort()),
    calibrationSignature: input.pixelsPerMeter ? String(input.pixelsPerMeter) : "uncalibrated",
    settingsSignature: openingSettingsSignature(settings),
    status: candidates.length > 0 ? "complete" : "partial",
    startedAt: null,
    completedAt: Date.now(),
    candidates,
    findings,
    stale: false,
  };
}
