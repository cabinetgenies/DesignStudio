import type { RawPdfTextItem } from "./pdf";

export const PLAN_ANALYSIS_VERSION = 1;

export type PlanAnalysisStatus =
  | "not-analyzed"
  | "analyzing"
  | "complete"
  | "partial"
  | "failed"
  | "stale";

export type PlanAnalysisSource = "native-pdf-text" | "raster-ocr" | "combined";

export type TextSourceType = "native-pdf-text" | "raster-ocr";

export interface PlanTextItem {
  id: string;
  raw: string;
  normalized: string;
  sourceType: TextSourceType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number | null;
  confidence: number;
  pageNumber: number;
}

export type DimensionFormat =
  | "imperial-feet-inches"
  | "imperial-feet"
  | "imperial-inches"
  | "metric-mm"
  | "metric-cm"
  | "metric-m";

export type DimensionReview = "unreviewed" | "accepted" | "rejected";

export interface DimensionCandidate {
  id: string;
  raw: string;
  normalized: string;
  meters: number;
  display: string;
  format: DimensionFormat;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  confidence: number;
  ocrConfidence: number | null;
  combinedConfidence: number | null;
  sourceType: TextSourceType | "combined";
  status: "valid" | "warning" | "rejected";
  reason: string | null;
  sourceTextIds: string[];
  review: DimensionReview;
  correctedMeters: number | null;
}

export interface PlanAnalysisFinding {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface PlanAnalysis {
  id: string;
  sourceFile: string | null;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  pageRotation: number;
  status: PlanAnalysisStatus;
  startedAt: number | null;
  completedAt: number | null;
  version: number;
  source: PlanAnalysisSource;
  stale: boolean;
  textItems: PlanTextItem[];
  candidates: DimensionCandidate[];
  findings: PlanAnalysisFinding[];
}

export interface DimensionParseResult {
  meters: number;
  display: string;
  format: DimensionFormat;
  status: "valid" | "warning" | "rejected";
  reason: string | null;
  confidence: number;
}

const FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "¼": 0.25,
  "⅕": 0.2,
  "⅙": 1 / 6,
  "⅛": 0.125,
  "⅔": 2 / 3,
  "¾": 0.75,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function toPlainFraction(raw: string): string {
  let text = raw;
  for (const [symbol, value] of Object.entries(FRACTIONS)) {
    text = text.replaceAll(symbol, ` ${value} `);
  }
  return text;
}

export function normalizePlanText(raw: string): string {
  let text = raw;
  text = toPlainFraction(text);
  text = text
    .replace(/[\u2032\u02B9\u2019\u2018]/g, "'")
    .replace(/[\u2033\u201D\u201C]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return text;
}

function parseMixedNumber(segment: string): number | null {
  const text = segment.trim();
  if (!text) {
    return null;
  }
  const wholeAndFraction = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (wholeAndFraction) {
    const denominator = Number.parseInt(wholeAndFraction[3], 10);
    if (denominator === 0) {
      return null;
    }
    return (
      Number.parseInt(wholeAndFraction[1], 10) +
      Number.parseInt(wholeAndFraction[2], 10) / denominator
    );
  }
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number.parseInt(fraction[2], 10);
    if (denominator === 0) {
      return null;
    }
    return Number.parseInt(fraction[1], 10) / denominator;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

function inchesToMeters(inches: number): number {
  return inches * 0.0254;
}

function finalizeDimension(
  meters: number,
  format: DimensionFormat,
  raw: string,
  display: string,
): DimensionParseResult | null {
  if (!Number.isFinite(meters) || meters <= 0) {
    return null;
  }
  let status: DimensionParseResult["status"] = "valid";
  let reason: string | null = null;
  if (meters < 0.03 || meters > 30) {
    status = "warning";
    reason = "Implausible architectural dimension";
  }
  return {
    meters,
    display,
    format,
    status,
    reason,
    confidence: format.includes("metric") ? 0.94 : 0.92,
  };
}

export function parseDimensionText(raw: string): DimensionParseResult | null {
  const normalized = normalizePlanText(raw);
  if (!normalized) {
    return null;
  }

  // Scale notes and ratios are not dimensions.
  if (/^(\d+)\/(\d+)$/.test(normalized) || /:\d+$/.test(normalized)) {
    return null;
  }

  // Metric first.
  const metric = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(mm|millimeters?|cm|centimeters?|m|meters?|metres?)$/,
  );
  if (metric) {
    const value = Number.parseFloat(metric[1]);
    const unit = metric[2];
    const format: DimensionFormat = unit.startsWith("mm")
      ? "metric-mm"
      : unit.startsWith("cm")
        ? "metric-cm"
        : "metric-m";
    const meters =
      format === "metric-mm"
        ? value / 1000
        : format === "metric-cm"
          ? value / 100
          : value;
    return finalizeDimension(meters, format, raw, `${value} ${unit}`);
  }

  // Feet + inches with symbols.
  const feetInches = normalized.match(
    /^(\d+(?:\.\d+)?)\s*'\s*(?:-)?\s*(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*"?$/,
  );
  if (feetInches) {
    const feet = Number.parseFloat(feetInches[1]);
    const inches = parseMixedNumber(feetInches[2]);
    if (inches !== null) {
      return finalizeDimension(
        feetToMeters(feet) + inchesToMeters(inches),
        "imperial-feet-inches",
        raw,
        `${feet}'-${inches}"`,
      );
    }
  }

  // Feet + inches with FT/IN words.
  const feetInchesWords = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s*(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*(?:in|inch|inches)?$/,
  );
  if (feetInchesWords) {
    const feet = Number.parseFloat(feetInchesWords[1]);
    const inches = parseMixedNumber(feetInchesWords[2]);
    if (inches !== null) {
      return finalizeDimension(
        feetToMeters(feet) + inchesToMeters(inches),
        "imperial-feet-inches",
        raw,
        `${feet} ft ${inches} in`,
      );
    }
  }

  // Hyphenated feet-inches (ambiguous).
  const hyphenated = normalized.match(
    /^(\d+)\s*-\s*(\d+(?:\s+\d+\/\d+|\/\d+)?)$/,
  );
  if (hyphenated) {
    const feet = Number.parseFloat(hyphenated[1]);
    const inches = parseMixedNumber(hyphenated[2]);
    if (inches !== null) {
      const result = finalizeDimension(
        feetToMeters(feet) + inchesToMeters(inches),
        "imperial-feet-inches",
        raw,
        `${feet}'-${inches}"`,
      );
      if (result) {
        result.status = "warning";
        result.reason = "Ambiguous hyphenated dimension";
        result.confidence = 0.62;
      }
      return result;
    }
  }

  // Feet only.
  const feetOnly = normalized.match(/^(\d+(?:\.\d+)?)\s*'$/);
  if (feetOnly) {
    const feet = Number.parseFloat(feetOnly[1]);
    return finalizeDimension(
      feetToMeters(feet),
      "imperial-feet",
      raw,
      `${feet}'`,
    );
  }

  // Inches only.
  const inchesOnly = normalized.match(
    /^(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*"$/,
  );
  if (inchesOnly) {
    const inches = parseMixedNumber(inchesOnly[1]);
    if (inches !== null) {
      return finalizeDimension(
        inchesToMeters(inches),
        "imperial-inches",
        raw,
        `${inches}"`,
      );
    }
  }

  const inchesWord = normalized.match(
    /^(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*(?:in|inch|inches)$/,
  );
  if (inchesWord) {
    const inches = parseMixedNumber(inchesWord[1]);
    if (inches !== null) {
      return finalizeDimension(
        inchesToMeters(inches),
        "imperial-inches",
        raw,
        `${inches}"`,
      );
    }
  }

  // Bare number is not accepted.
  return null;
}

export interface GroupedTextChunk {
  text: string;
  raw: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceIds: string[];
  confidence: number;
}

function textBoundsToCanonical(
  transform: number[],
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number; rotation: number } {
  const a = transform[0] ?? 0;
  const b = transform[1] ?? 0;
  const c = transform[2] ?? 0;
  const d = transform[3] ?? 0;
  const e = transform[4] ?? 0;
  const f = transform[5] ?? 0;

  const rotation = (Math.atan2(b, a) * 180) / Math.PI;
  const corners = [
    [e, f],
    [a * width + e, b * width + f],
    [c * height + e, d * height + f],
    [a * width + c * height + e, b * width + d * height + f],
  ].map(([x, y]) => ({ x, y: pageHeight - y }));

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 0.01),
    height: Math.max(maxY - minY, 0.01),
    rotation,
  };
}

export function buildTextItems(
  rawItems: RawPdfTextItem[],
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
): PlanTextItem[] {
  return rawItems.map((item, index) => {
    const bounds = textBoundsToCanonical(
      item.transform,
      item.width,
      item.height,
      pageWidth,
      pageHeight,
    );
    return {
      id: `txt-${pageNumber}-${index}`,
      raw: item.str,
      normalized: normalizePlanText(item.str),
      sourceType: "native-pdf-text",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: bounds.rotation,
      fontSize: item.fontSize,
      confidence: 0.9,
      pageNumber,
    };
  });
}

export function groupDimensionFragments(
  textItems: PlanTextItem[],
): GroupedTextChunk[] {
  const sorted = [...textItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > Math.max(a.height, b.height, 1) * 0.4) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const chunks: GroupedTextChunk[] = [];
  let current: GroupedTextChunk | null = null;

  for (const item of sorted) {
    if (!current) {
      current = {
        text: item.normalized,
        raw: item.raw,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        sourceIds: [item.id],
        confidence: item.confidence,
      };
      continue;
    }

    const baselineGap = Math.abs(item.y - current.y);
    const horizontalGap = item.x - (current.x + current.width);
    const fontScale = Math.max(item.fontSize ?? 8, 1);
    const sameBaseline = baselineGap < Math.max(item.height, current.height, fontScale) * 0.45;
    const closeEnough = horizontalGap < fontScale * 1.2 && horizontalGap > -fontScale * 0.5;

    if (sameBaseline && closeEnough) {
      const separator = horizontalGap > fontScale * 0.25 ? " " : "";
      current.text = `${current.text}${separator}${item.normalized}`.trim();
      current.raw = `${current.raw}${separator ? " " : ""}${item.raw}`.trim();
      current.width =
        Math.max(current.x + current.width, item.x + item.width) - current.x;
      current.height = Math.max(current.height, item.height);
      current.sourceIds.push(item.id);
    } else {
      chunks.push(current);
      current = {
        text: item.normalized,
        raw: item.raw,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        sourceIds: [item.id],
        confidence: item.confidence,
      };
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter((chunk) => chunk.sourceIds.length > 1);
}

export function analyzePlanText(input: {
  rawItems: RawPdfTextItem[];
  sourceFile: string | null;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  pageRotation: number;
  analysisId: string;
  startedAt: number;
}): PlanAnalysis {
  const textItems = buildTextItems(
    input.rawItems,
    input.pageNumber,
    input.pageWidth,
    input.pageHeight,
  );
  const candidates: DimensionCandidate[] = [];
  const findings: PlanAnalysisFinding[] = [];

  const addCandidate = (
    raw: string,
    normalized: string,
    parsed: DimensionParseResult,
    bounds: { x: number; y: number; width: number; height: number; rotation: number },
    sourceIds: string[],
    confidence: number,
  ) => {
    candidates.push({
      id: `dim-${input.pageNumber}-${candidates.length}`,
      raw,
      normalized,
      meters: parsed.meters,
      display: parsed.display,
      format: parsed.format,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: bounds.rotation,
      confidence,
      ocrConfidence: null,
      combinedConfidence: null,
      sourceType: "native-pdf-text",
      status: parsed.status,
      reason: parsed.reason,
      sourceTextIds: sourceIds,
      review: "unreviewed",
      correctedMeters: null,
    });
  };

  for (const item of textItems) {
    const parsed = parseDimensionText(item.raw);
    if (parsed) {
      addCandidate(
        item.raw,
        item.normalized,
        parsed,
        { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation },
        [item.id],
        parsed.confidence,
      );
    }
  }

  for (const chunk of groupDimensionFragments(textItems)) {
    const parsed = parseDimensionText(chunk.raw);
    if (parsed) {
      addCandidate(
        chunk.raw,
        chunk.text,
        parsed,
        { x: chunk.x, y: chunk.y, width: chunk.width, height: chunk.height, rotation: 0 },
        chunk.sourceIds,
        Math.max(0.72, parsed.confidence),
      );
    }
  }

  if (textItems.length === 0) {
    findings.push({
      id: "no-text",
      severity: "warning",
      message: "No native PDF text found. OCR will be required in a later milestone.",
    });
  }

  return {
    id: input.analysisId,
    sourceFile: input.sourceFile,
    pageNumber: input.pageNumber,
    pageWidth: input.pageWidth,
    pageHeight: input.pageHeight,
    pageRotation: input.pageRotation,
    status: textItems.length > 0 ? "complete" : "partial",
    startedAt: input.startedAt,
    completedAt: Date.now(),
    version: PLAN_ANALYSIS_VERSION,
    source: "native-pdf-text",
    stale: false,
    textItems,
    candidates,
    findings,
  };
}

export interface OcrWordInput {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrRasterMapping {
  scale: number;
  crop: { x: number; y: number; width: number; height: number } | null;
  pageWidth: number;
  pageHeight: number;
}

export function normalizeOcrText(raw: string): string {
  let text = raw;
  text = text.replace(/[∕⁄]/g, "/");
  text = text.replace(/\|/g, "1");
  text = text.replace(/(\d)[Oo](\d)/g, "$10$2");
  text = text.replace(/(\d)[lI](\d)/g, "$11$2");
  return normalizePlanText(text);
}

export function analyzeOcrWords(input: {
  words: OcrWordInput[];
  mapping: OcrRasterMapping;
  sourceFile: string | null;
  pageNumber: number;
  pageRotation: number;
  analysisId: string;
  startedAt: number;
}): PlanAnalysis {
  const { words, mapping, sourceFile, pageNumber, pageRotation, analysisId, startedAt } = input;
  const textItems: PlanTextItem[] = [];
  const candidates: DimensionCandidate[] = [];

  const toCanonical = (word: OcrWordInput) => {
    const offsetX = mapping.crop?.x ?? 0;
    const offsetY = mapping.crop?.y ?? 0;
    return {
      x: offsetX + word.bbox.x0 / mapping.scale,
      y: offsetY + word.bbox.y0 / mapping.scale,
      width: (word.bbox.x1 - word.bbox.x0) / mapping.scale,
      height: (word.bbox.y1 - word.bbox.y0) / mapping.scale,
    };
  };

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const bounds = toCanonical(word);
    const normalized = normalizeOcrText(word.text);
    textItems.push({
      id: `ocr-${pageNumber}-${index}`,
      raw: word.text,
      normalized,
      sourceType: "raster-ocr",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      fontSize: null,
      confidence: word.confidence,
      pageNumber,
    });

    const parsed = parseDimensionText(normalized);
    if (parsed) {
      const corrected = normalized !== normalizePlanText(word.text);
      const status = corrected || word.confidence < 0.6 ? "warning" : parsed.status;
      candidates.push({
        id: `dim-ocr-${pageNumber}-${index}`,
        raw: word.text,
        normalized,
        meters: parsed.meters,
        display: parsed.display,
        format: parsed.format,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        confidence: parsed.confidence,
        ocrConfidence: word.confidence,
        combinedConfidence: parsed.confidence * word.confidence,
        sourceType: "raster-ocr",
        status,
        reason: corrected
          ? "OCR text was corrected"
          : word.confidence < 0.6
            ? "Low OCR confidence"
            : parsed.reason,
        sourceTextIds: [`ocr-${pageNumber}-${index}`],
        review: "unreviewed",
        correctedMeters: null,
      });
    }
  }

  return {
    id: analysisId,
    sourceFile,
    pageNumber,
    pageWidth: mapping.pageWidth,
    pageHeight: mapping.pageHeight,
    pageRotation,
    status: words.length > 0 ? "complete" : "partial",
    startedAt,
    completedAt: Date.now(),
    version: PLAN_ANALYSIS_VERSION,
    source: "raster-ocr",
    stale: false,
    textItems,
    candidates,
    findings:
      words.length === 0
        ? [
            {
              id: "ocr-no-words",
              severity: "warning",
              message: "OCR produced no recognized text.",
            },
          ]
        : [],
  };
}

function overlapRatio(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const ax1 = a.x + a.width;
  const ay1 = a.y + a.height;
  const bx1 = b.x + b.width;
  const by1 = b.y + b.height;
  const interX = Math.max(0, Math.min(ax1, bx1) - Math.max(a.x, b.x));
  const interY = Math.max(0, Math.min(ay1, by1) - Math.max(a.y, b.y));
  const intersection = interX * interY;
  const union =
    a.width * a.height + b.width * b.height - Math.max(intersection, 0);
  return union > 0 ? intersection / union : 0;
}

function candidatesDuplicate(
  a: DimensionCandidate,
  b: DimensionCandidate,
): boolean {
  if (a.sourceType === "native-pdf-text" && b.sourceType === "raster-ocr") {
    return false;
  }
  const sameMeasurement =
    Math.abs(a.meters - b.meters) <= Math.max(a.meters, b.meters, 1) * 0.05;
  return overlapRatio(a, b) > 0.35 && sameMeasurement;
}

export function mergePlanAnalyses(
  native: PlanAnalysis,
  ocr: PlanAnalysis,
): PlanAnalysis {
  const mergedCandidates: DimensionCandidate[] = [...native.candidates];

  for (const ocrCandidate of ocr.candidates) {
    const duplicateIndex = mergedCandidates.findIndex((existing) =>
      candidatesDuplicate(ocrCandidate, existing),
    );
    if (duplicateIndex >= 0) {
      const existing = mergedCandidates[duplicateIndex];
      mergedCandidates[duplicateIndex] = {
        ...existing,
        sourceType: "combined",
        ocrConfidence: ocrCandidate.ocrConfidence,
        combinedConfidence:
          (existing.combinedConfidence ?? existing.confidence) *
          (ocrCandidate.ocrConfidence ?? 1),
        sourceTextIds: Array.from(
          new Set([...existing.sourceTextIds, ...ocrCandidate.sourceTextIds]),
        ),
      };
      continue;
    }
    // Also drop OCR duplicates of other OCR items.
    if (
      !mergedCandidates.some((existing) => candidatesDuplicate(existing, ocrCandidate))
    ) {
      mergedCandidates.push(ocrCandidate);
    }
  }

  const textItems = [...native.textItems, ...ocr.textItems];
  return {
    ...native,
    source: "combined",
    textItems,
    candidates: mergedCandidates,
    findings: [...native.findings, ...ocr.findings],
  };
}

export function preserveCandidateReviews(
  previous: DimensionCandidate[],
  next: DimensionCandidate[],
): DimensionCandidate[] {
  return next.map((candidate) => {
    const match = previous.find(
      (old) =>
        old.normalized === candidate.normalized &&
        Math.abs(old.meters - candidate.meters) < 1e-4,
    );
    return match
      ? { ...candidate, review: match.review, correctedMeters: match.correctedMeters }
      : candidate;
  });
}
