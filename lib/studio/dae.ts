import type { MaterialZoneId } from "./material-zones";

export type DaeImportStatus = "idle" | "loading" | "ready" | "failed";

export interface DaeImportMetadata {
  sourceFile: string;
  unit: string | null;
  metersPerUnit: number | null;
  upAxis: string | null;
  dimensions: {
    widthMeters: number;
    heightMeters: number;
    depthMeters: number;
  } | null;
  objectCount: number | null;
  meshCount: number | null;
  materialCount: number | null;
  missingTextures: string[];
  warnings: string[];
  groupProposals: { zone: MaterialZoneId; count: number }[];
  sourceGeometryCount: number;
  sourceInstanceCount: number;
  sourceNodeCount: number;
  duplicateIdCount: number;
  parsedMeshCount: number | null;
  visibleMeshCount: number | null;
  findings: string[];
}

export interface DaeImportState {
  status: DaeImportStatus;
  source: "imported-from-dae" | null;
  fileName: string | null;
  fileSize: number | null;
  error: string | null;
  objectUrl: string | null;
  metadata: DaeImportMetadata | null;
}

export const EMPTY_DAE_IMPORT: DaeImportState = {
  status: "idle",
  source: null,
  fileName: null,
  fileSize: null,
  error: null,
  objectUrl: null,
  metadata: null,
};

export const MAX_DAE_BYTES = 500 * 1024 * 1024;

export interface CutListRow {
  usercode: string;
  description: string;
  material: string;
}

export interface DaeClassification {
  zone: MaterialZoneId;
  confidence: "high" | "medium" | "low";
  reason: string;
}

const CABINET_BASE_PATTERN = /^(B|DB|SB)[0-9]/i;
const CABINET_WALL_PATTERN = /^W[0-9]/i;
const TALL_PATTERN = /(UC|PANTRY|TALL)/i;
const APPLIANCE_PATTERN = /(range|oven|fridge|refrigerator|dishwasher|microwave|hood|vent)/i;
const WALL_PATTERN = /(wall group|^wall$|surface-wall)/i;
const FLOOR_PATTERN = /(^floor$|flooring)/i;
const COUNTER_PATTERN = /(counter|top|surface-counter|worktop)/i;
const BACKSPLASH_PATTERN = /(backsplash|splash)/i;
const HARDWARE_PATTERN = /(handle|knob|pull|hinge)/i;
const PLUMBING_PATTERN = /(sink|faucet|tap|plumbing)/i;
const LIGHT_PATTERN = /(light|lamp)/i;

export function classifyDaeName(name: string): DaeClassification {
  if (!name) {
    return { zone: "other", confidence: "low", reason: "No name" };
  }
  if (WALL_PATTERN.test(name)) {
    return { zone: "walls", confidence: "high", reason: "Wall name" };
  }
  if (FLOOR_PATTERN.test(name)) {
    return { zone: "floor", confidence: "medium", reason: "Floor name" };
  }
  if (COUNTER_PATTERN.test(name)) {
    return { zone: "countertops", confidence: "medium", reason: "Counter name" };
  }
  if (BACKSPLASH_PATTERN.test(name)) {
    return { zone: "backsplash", confidence: "medium", reason: "Backsplash name" };
  }
  if (HARDWARE_PATTERN.test(name)) {
    return { zone: "hardware", confidence: "medium", reason: "Hardware name" };
  }
  if (PLUMBING_PATTERN.test(name)) {
    return { zone: "plumbing", confidence: "medium", reason: "Plumbing name" };
  }
  if (LIGHT_PATTERN.test(name)) {
    return { zone: "other", confidence: "medium", reason: "Light fixture" };
  }
  if (APPLIANCE_PATTERN.test(name)) {
    return { zone: "appliances", confidence: "medium", reason: "Appliance name" };
  }
  if (TALL_PATTERN.test(name)) {
    return { zone: "tall-cabinets", confidence: "medium", reason: "Tall cabinet name" };
  }
  if (CABINET_WALL_PATTERN.test(name)) {
    return { zone: "perimeter", confidence: "medium", reason: "Wall cabinet code" };
  }
  if (CABINET_BASE_PATTERN.test(name)) {
    return { zone: "perimeter", confidence: "medium", reason: "Base cabinet code" };
  }
  return { zone: "other", confidence: "low", reason: "Needs review" };
}

export function parseDaeUnit(text: string): {
  unit: string | null;
  metersPerUnit: number | null;
  upAxis: string | null;
} {
  const unitMatch = text.match(/<unit\s+name="([^"]+)"\s+meter="([^"]+)"\s*\/?>/i) ||
    text.match(/<unit\s+meter="([^"]+)"\s+name="([^"]+)"\s*\/?>/i);
  const upAxisMatch = text.match(/<up_axis>\s*(X_UP|Y_UP|Z_UP)\s*<\/up_axis>/i);

  let unit: string | null = null;
  let metersPerUnit: number | null = null;
  if (unitMatch) {
    const nameIndex = unitMatch[1] && unitMatch[2] ? (unitMatch[1].toLowerCase() === "meter" ? 2 : 1) : null;
    if (nameIndex && unitMatch[nameIndex]) {
      unit = unitMatch[nameIndex];
    }
    const numericIndex = unitMatch[1] && unitMatch[2] ? (unitMatch[1].toLowerCase() === "meter" ? 1 : 2) : null;
    const numeric = numericIndex ? unitMatch[numericIndex] : null;
    if (numeric) {
      const parsed = Number.parseFloat(numeric);
      if (Number.isFinite(parsed) && parsed > 0) {
        metersPerUnit = parsed;
      }
    }
  }

  return {
    unit,
    metersPerUnit,
    upAxis: upAxisMatch?.[1] ?? null,
  };
}

export function extractMissingTextureFiles(text: string): string[] {
  const files = new Set<string>();
  for (const match of text.matchAll(
    /<init_from>\s*([^<\s]+)\s*<\/init_from>/g,
  )) {
    const value = match[1].replace(/^\.\//, "").replace(/\\/g, "/");
    if (/\.(jpg|jpeg|png)$/i.test(value)) {
      const basename = value.split("/").pop();
      if (basename) {
        files.add(basename);
      }
    }
  }
  return [...files].sort();
}

export function auditDaeSource(text: string): {
  sourceGeometryCount: number;
  sourceInstanceCount: number;
  sourceNodeCount: number;
  duplicateIdCount: number;
} {
  const sourceGeometryCount = (text.match(/<geometry\s+id=/g) || []).length;
  const sourceInstanceCount = (text.match(/<instance_geometry\s+/g) || []).length;
  const sourceNodeCount = (text.match(/<node\s+id=/g) || []).length;

  const ids = new Map<string, number>();
  for (const match of text.matchAll(/<node\s+id="([^"]+)"/g)) {
    const id = match[1];
    ids.set(id, (ids.get(id) ?? 0) + 1);
  }
  const duplicateIdCount = [...ids.values()].reduce(
    (sum, count) => sum + Math.max(count - 1, 0),
    0,
  );

  return {
    sourceGeometryCount,
    sourceInstanceCount,
    sourceNodeCount,
    duplicateIdCount,
  };
}

export function parseCutListCsv(text: string): CutListRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
  const usercodeIndex = headers.findIndex((h) => h === "usercode" || h === "user code");
  if (usercodeIndex === -1) {
    return [];
  }
  const descriptionIndex = headers.findIndex((h) =>
    ["description", "part description", "item", "product"].includes(h),
  );
  const materialIndex = headers.findIndex((h) =>
    ["material", "material name", "finish"].includes(h),
  );

  const rows: CutListRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(",").map((value) => value.trim());
    const usercode = cells[usercodeIndex];
    if (!usercode) {
      continue;
    }
    rows.push({
      usercode,
      description: descriptionIndex >= 0 ? cells[descriptionIndex] ?? "" : "",
      material: materialIndex >= 0 ? cells[materialIndex] ?? "" : "",
    });
  }
  return rows;
}

export function describeEncryptedXml(): string {
  return "The companion XML is password-protected. The 3D design can still be imported without it.";
}

export function isDaeReady(state: DaeImportState): boolean {
  return state.status === "ready" && Boolean(state.objectUrl);
}
