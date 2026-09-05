import {
  DEFAULT_WALL_DETECTION_SETTINGS,
  WALL_DETECTION_VERSION,
  mergeCollinearSegments,
  normalizeSegment,
  pairParallelLines,
  segmentAngle,
  segmentLength,
  wallDetectionSettingsSignature,
  type DetectedWallCandidate,
  type DetectedLineSegment,
  type WallDetectionAnalysis,
  type WallDetectionSettings,
} from "./wall-detection";

export type WallDetectionPreset = "automatic" | "cad" | "scanned" | "faint" | "heavy";

export const WALL_DETECTION_PRESETS: { value: WallDetectionPreset; label: string }[] = [
  { value: "automatic", label: "Automatic" },
  { value: "cad", label: "Clean CAD Export" },
  { value: "scanned", label: "Scanned Floor Plan" },
  { value: "faint", label: "Faint Lines" },
  { value: "heavy", label: "Heavy Linework" },
];

interface RasterLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strength: number;
}

export function preprocessWallBinary(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  preset: WallDetectionPreset,
): Uint8Array {
  const count = width * height;
  const grays = new Float32Array(count);
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    const o = i * 4;
    const g = 0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2];
    grays[i] = g;
    sum += g;
  }
  const mean = sum / count;

  const binary = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    let g = grays[i];
    if (preset === "automatic" && mean < 128) {
      g = 255 - g;
    }
    if (preset === "faint") {
      g = Math.max(0, Math.min(255, (g - mean) * 2.2 + 128));
    }
    if (preset === "heavy") {
      g = 255 - g;
    }
    const threshold = preset === "cad" ? 200 : preset === "scanned" ? 150 : 128;
    binary[i] = g < threshold ? 255 : 0;
  }
  return binary;
}

export function detectLineSegments(
  binary: Uint8Array,
  width: number,
  height: number,
  settings: WallDetectionSettings,
): RasterLine[] {
  const fg: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 1_500_000)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (binary[y * width + x] === 255) {
        fg.push({ x, y });
      }
    }
  }

  const thetaStep = 2;
  const rhoStep = 2;
  const diag = Math.hypot(width, height);
  const rhoBins = Math.ceil((diag * 2) / rhoStep);
  const thetaBins = Math.ceil(180 / thetaStep);
  const accum = new Int32Array(rhoBins * thetaBins);
  const thetaRad: number[] = [];
  for (let t = 0; t < thetaBins; t += 1) {
    thetaRad.push((t * thetaStep * Math.PI) / 180);
  }

  for (const p of fg) {
    for (let t = 0; t < thetaBins; t += 1) {
      const rho = p.x * Math.cos(thetaRad[t]) + p.y * Math.sin(thetaRad[t]);
      const r = Math.round((rho + diag) / rhoStep);
      accum[r * thetaBins + t] += 1;
    }
  }

  const peaks: { theta: number; rho: number; votes: number }[] = [];
  for (let r = 1; r < rhoBins - 1; r += 1) {
    for (let t = 1; t < thetaBins - 1; t += 1) {
      const v = accum[r * thetaBins + t];
      if (v < settings.minVotes) {
        continue;
      }
      const neighbors = [
        accum[(r - 1) * thetaBins + t],
        accum[(r + 1) * thetaBins + t],
        accum[r * thetaBins + t - 1],
        accum[r * thetaBins + t + 1],
      ];
      if (v >= Math.max(...neighbors)) {
        const theta = t * thetaStep;
        const rho = r * rhoStep - diag;
        peaks.push({ theta, rho, votes: v });
      }
    }
  }
  peaks.sort((a, b) => b.votes - a.votes);
  const top = peaks.slice(0, 500);

  const lines: RasterLine[] = [];
  for (const peak of top) {
    const rad = (peak.theta * Math.PI) / 180;
    const nx = Math.cos(rad);
    const ny = Math.sin(rad);
    const tx = -Math.sin(rad);
    const ty = Math.cos(rad);
    const along: { u: number; x: number; y: number }[] = [];
    for (const p of fg) {
      const rho = p.x * nx + p.y * ny;
      if (Math.abs(rho - peak.rho) <= 2) {
        along.push({ u: p.x * tx + p.y * ty, x: p.x, y: p.y });
      }
    }
    along.sort((a, b) => a.u - b.u);
    let runStart = 0;
    for (let i = 1; i <= along.length; i += 1) {
      const gap = i < along.length ? along[i].u - along[i - 1].u : Infinity;
      if (gap > settings.gapBridgePx || i === along.length) {
        const run = along.slice(runStart, i);
        if (run.length >= 2) {
          const a = run[0];
          const b = run[run.length - 1];
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          if (length >= settings.minLengthPx) {
            lines.push({
              x1: a.x,
              y1: a.y,
              x2: b.x,
              y2: b.y,
              strength: peak.votes,
            });
          }
        }
        runStart = i;
      }
    }
  }
  return lines;
}

export function detectWallSegmentsInRaster(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: WallDetectionSettings,
  preset: WallDetectionPreset,
): {
  rawLines: DetectedLineSegment[];
  cleanedLines: DetectedLineSegment[];
  candidates: DetectedWallCandidate[];
} {
  const binary = preprocessWallBinary(pixels, width, height, preset);
  const rawRaster = detectLineSegments(binary, width, height, settings);
  const rawLines: DetectedLineSegment[] = rawRaster.map((line, index) => {
    const normalized = normalizeSegment(line.x1, line.y1, line.x2, line.y2);
    return {
      id: `raw-${index}`,
      ...normalized,
      lengthPx: segmentLength(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
      angleDeg: segmentAngle(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
      strength: line.strength,
      source: "raster-wall-detection",
      raw: true,
    };
  });
  const cleanedLines = mergeCollinearSegments(
    rawLines,
    settings.angleToleranceDeg,
    settings.gapBridgePx,
  );
  const candidates = pairParallelLines(cleanedLines, settings);
  return { rawLines, cleanedLines, candidates };
}

export interface WallDetectionInput {
  raster: {
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
    scale: number;
    crop: { x: number; y: number; width: number; height: number } | null;
    widthPt: number;
    heightPt: number;
  };
  preset: WallDetectionPreset;
  settings: WallDetectionSettings;
  sourceFile: string | null;
  pageNumber: number;
  pageRotation: number;
  analysisId: string;
  startedAt: number;
  pixelsPerMeter: number | null;
  textBounds?: { x: number; y: number; width: number; height: number }[];
  useTextAware?: boolean;
}

export function runWallDetection(input: WallDetectionInput): WallDetectionAnalysis {
  const { raster, preset, settings, sourceFile, pageNumber, analysisId, startedAt, pixelsPerMeter, textBounds = [], useTextAware = false } = input;
  const detected = detectWallSegmentsInRaster(
    raster.pixels,
    raster.width,
    raster.height,
    settings,
    preset,
  );

  const toCanonical = (p: { x: number; y: number }) => ({
    x: (raster.crop?.x ?? 0) + p.x / raster.scale,
    y: (raster.crop?.y ?? 0) + p.y / raster.scale,
  });

  const rawLines: DetectedLineSegment[] = detected.rawLines.map((line) => {
    const a = toCanonical({ x: line.x1, y: line.y1 });
    const b = toCanonical({ x: line.x2, y: line.y2 });
    const normalized = normalizeSegment(a.x, a.y, b.x, b.y);
    return {
      ...normalized,
      id: line.id,
      lengthPx: segmentLength(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
      angleDeg: segmentAngle(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
      strength: line.strength,
      source: "raster-wall-detection",
      raw: true,
    };
  });

  const cleanedLines: DetectedLineSegment[] = detected.cleanedLines.map((line) => {
    const a = toCanonical({ x: line.x1, y: line.y1 });
    const b = toCanonical({ x: line.x2, y: line.y2 });
    const normalized = normalizeSegment(a.x, a.y, b.x, b.y);
    return {
      ...line,
      ...normalized,
      lengthPx: segmentLength(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
      angleDeg: segmentAngle(normalized.x1, normalized.y1, normalized.x2, normalized.y2),
    };
  });

  const candidates = detected.candidates.map((candidate) => {
    let confidence = candidate.confidence;
    const reasons = [...candidate.reasons];
    const a = toCanonical({ x: candidate.centerline.x1, y: candidate.centerline.y1 });
    const b = toCanonical({ x: candidate.centerline.x2, y: candidate.centerline.y2 });
    const centerline = normalizeSegment(a.x, a.y, b.x, b.y);
    const lengthPx = segmentLength(centerline.x1, centerline.y1, centerline.x2, centerline.y2);
    const thicknessPx = candidate.thicknessPx / raster.scale;
    const lengthM = pixelsPerMeter ? lengthPx / pixelsPerMeter : null;
    const thicknessM = pixelsPerMeter ? thicknessPx / pixelsPerMeter : null;
    if (useTextAware && textBounds.length > 0) {
      const mx = (centerline.x1 + centerline.x2) / 2;
      const my = (centerline.y1 + centerline.y2) / 2;
      const overlaps = textBounds.some(
        (box) =>
          mx >= box.x &&
          mx <= box.x + box.width &&
          my >= box.y &&
          my <= box.y + box.height,
      );
      if (overlaps) {
        confidence = Math.max(0, confidence - 0.2);
        reasons.push("Overlaps dimension text");
      }
    }
    const cx = (centerline.x1 + centerline.x2) / 2;
    const cy = (centerline.y1 + centerline.y2) / 2;
    const margin = Math.min(raster.widthPt, raster.heightPt) * 0.03;
    const nearBorder =
      cx < margin ||
      cx > raster.widthPt - margin ||
      cy < margin ||
      cy > raster.heightPt - margin;
    if (nearBorder && lengthPx > raster.widthPt * 0.3) {
      confidence = Math.max(0, confidence - 0.15);
      reasons.push("Possible page border");
    }
    const titleBlockZone =
      cx > raster.widthPt * 0.65 && cy > raster.heightPt * 0.75;
    if (titleBlockZone && lengthPx < raster.widthPt * 0.25) {
      confidence = Math.max(0, confidence - 0.1);
      reasons.push("Possible title block");
    }
    return {
      ...candidate,
      centerline,
      confidence,
      reasons,
      thicknessM,
      lengthM,
      thicknessPx,
      lengthPx,
      heightM: null,
      original: {
        centerline,
        thicknessPx,
        thicknessM,
        heightM: null,
        angleDeg: candidate.angleDeg,
        lengthPx,
        lengthM,
        confidence: candidate.confidence,
        reasons: candidate.reasons,
      },
    };
  });

  const findings: WallDetectionAnalysis["findings"] = [];
  if (rawLines.length === 0) {
    findings.push({
      id: "no-lines",
      severity: "warning",
      message: "No structural wall lines were detected.",
    });
  }

  return {
    id: analysisId,
    sourceFile,
    pageNumber,
    crop: raster.crop,
    rasterScale: raster.scale,
    preset,
    useTextAware,
    version: WALL_DETECTION_VERSION,
    settingsSignature: wallDetectionSettingsSignature(settings),
    status: rawLines.length > 0 ? "complete" : "partial",
    startedAt,
    completedAt: Date.now(),
    stale: false,
    rawLines,
    cleanedLines,
    candidates,
    findings,
  };
}

export function defaultWallDetectionSettings(): WallDetectionSettings {
  return { ...DEFAULT_WALL_DETECTION_SETTINGS };
}
