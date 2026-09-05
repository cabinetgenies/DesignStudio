import type { V2MaterialZone } from "./materials";

export type V2MaterialRole =
  | "cabinet-finish"
  | "countertop"
  | "backsplash"
  | "floor"
  | "wall"
  | "hardware"
  | "plumbing"
  | "appliance"
  | "hood"
  | "glass"
  | "unknown";

export interface V2MaterialTarget {
  meshId: string;
  assemblyId: string;
  role: V2MaterialRole;
  zone: V2MaterialZone | null;
  confidence: number;
  reasons: string[];
}

export interface RuntimeMeshEvidence {
  id: string;
  name: string;
  parentName: string;
  dimensions: [number, number, number];
  center: [number, number, number];
  heightAboveFloor: number;
  volume: number;
  color: string | null;
  metalness: number;
  transparent: boolean;
}

export interface V2ClassificationSummary {
  targets: V2MaterialTarget[];
  zoneCounts: Record<
    V2MaterialZone,
    { assemblies: number; meshes: number; needsReview: number }
  >;
}

const APPLIANCE_PATTERN = /(range|oven|fridge|refrigerator|dishwasher|microwave|cooktop|appliance)/i;
const HARDWARE_PATTERN = /(handle|knob|pull|hinge)/i;
const CABINET_PATTERN = /^(B|DB|SB|W|UC|FS|GD|WEP|DD|TBW|CM|TKBM)[0-9]/i;

export function classifyRuntimeMeshes(
  meshes: RuntimeMeshEvidence[],
): V2ClassificationSummary {
  const targets: V2MaterialTarget[] = [];
  const assigned = new Set<string>();

  const floor = detectFloor(meshes);
  if (floor) {
    targets.push(makeTarget(floor, "floor", "floor", 0.7, ["Largest low horizontal surface"]));
    assigned.add(floor.id);
  }

  for (const mesh of meshes) {
    if (assigned.has(mesh.id)) continue;
    const wall = detectWall(mesh);
    if (wall) {
      targets.push(makeTarget(mesh, "wall", "walls", wall.confidence, wall.reasons));
      assigned.add(mesh.id);
    }
  }

  for (const mesh of meshes) {
    if (assigned.has(mesh.id)) continue;
    const counter = detectCountertop(mesh);
    if (counter) {
      targets.push(makeTarget(mesh, "countertop", "countertops", counter.confidence, counter.reasons));
      assigned.add(mesh.id);
    }
  }

  for (const mesh of meshes) {
    if (assigned.has(mesh.id)) continue;
    if (APPLIANCE_PATTERN.test(mesh.name) || (mesh.metalness > 0.7 && mesh.volume > 0.2)) {
      targets.push(makeTarget(mesh, "appliance", "appliances", 0.55, ["Appliance name or metallic volume"]));
      assigned.add(mesh.id);
    }
  }

  for (const mesh of meshes) {
    if (assigned.has(mesh.id)) continue;
    if (HARDWARE_PATTERN.test(mesh.name) || (mesh.volume < 0.02 && mesh.metalness > 0.5)) {
      targets.push(makeTarget(mesh, "hardware", "hardware", 0.55, ["Hardware name or small metallic part"]));
      assigned.add(mesh.id);
    }
  }

  for (const mesh of meshes) {
    if (assigned.has(mesh.id)) continue;
    if (/sink|faucet|tap|plumb/i.test(mesh.name)) {
      targets.push(makeTarget(mesh, "plumbing", "plumbing", 0.55, ["Plumbing name"]));
      assigned.add(mesh.id);
    }
  }

  const cabinetMeshes = meshes.filter(
    (mesh) => !assigned.has(mesh.id) && isCabinet(mesh),
  );
  const cabinetTargets = classifyCabinets(cabinetMeshes);
  for (const target of cabinetTargets) {
    targets.push(target);
    assigned.add(target.meshId);
  }

  for (const mesh of meshes) {
    if (!assigned.has(mesh.id)) {
      targets.push(makeTarget(mesh, "unknown", "unknown", 0, ["Needs review"]));
    }
  }

  const zoneCounts = buildZoneCounts(targets);
  return { targets, zoneCounts };
}

function makeTarget(
  mesh: RuntimeMeshEvidence,
  role: V2MaterialRole,
  zone: V2MaterialZone,
  confidence: number,
  reasons: string[],
): V2MaterialTarget {
  return {
    meshId: mesh.id,
    assemblyId: mesh.parentName || mesh.id,
    role,
    zone,
    confidence,
    reasons,
  };
}

function detectFloor(
  meshes: RuntimeMeshEvidence[],
): RuntimeMeshEvidence | null {
  const candidates = meshes.filter(
    (mesh) =>
      mesh.heightAboveFloor < 0.1 &&
      mesh.dimensions[1] < 0.15 &&
      mesh.dimensions[0] * mesh.dimensions[2] > 2,
  );
  candidates.sort(
    (a, b) => b.dimensions[0] * b.dimensions[2] - a.dimensions[0] * a.dimensions[2],
  );
  return candidates[0] ?? null;
}

function detectWall(mesh: RuntimeMeshEvidence): { confidence: number; reasons: string[] } | null {
  const [w, h, d] = mesh.dimensions;
  const vertical = h > 1.2 && d < 0.4 && w > 1.5;
  if (vertical || /wall|surface-wall/i.test(mesh.name)) {
    return {
      confidence: vertical ? 0.7 : 0.55,
      reasons: vertical ? ["Large thin vertical surface"] : ["Wall name"],
    };
  }
  return null;
}

function detectCountertop(mesh: RuntimeMeshEvidence): { confidence: number; reasons: string[] } | null {
  const [w, h, d] = mesh.dimensions;
  const horizontal = h < 0.12 && w > 0.4 && d > 0.4 && mesh.heightAboveFloor > 0.65 && mesh.heightAboveFloor < 1.2;
  if (horizontal || /counter|worktop|surface/i.test(mesh.name)) {
    return {
      confidence: horizontal ? 0.6 : 0.5,
      reasons: horizontal ? ["Thin elevated horizontal surface"] : ["Countertop name"],
    };
  }
  return null;
}

function isCabinet(mesh: RuntimeMeshEvidence): boolean {
  return CABINET_PATTERN.test(mesh.name) || CABINET_PATTERN.test(mesh.parentName);
}

function classifyCabinets(meshes: RuntimeMeshEvidence[]): V2MaterialTarget[] {
  const targets: V2MaterialTarget[] = [];
  const centers = meshes.map((mesh) => mesh.center);
  const modelCenterX = centers.reduce((sum, c) => sum + c[0], 0) / centers.length || 0;
  const modelCenterZ = centers.reduce((sum, c) => sum + c[2], 0) / centers.length || 0;

  for (const mesh of meshes) {
    const distanceFromCenter = Math.hypot(
      mesh.center[0] - modelCenterX,
      mesh.center[2] - modelCenterZ,
    );
    const tall = /UC|pantry|tall/i.test(mesh.name) || mesh.dimensions[1] > 2.1;
    if (tall) {
      targets.push(makeTarget(mesh, "cabinet-finish", "tall", 0.5, ["Tall cabinet dimension/name"]));
      continue;
    }
    if (distanceFromCenter < 1.2) {
      targets.push(makeTarget(mesh, "cabinet-finish", "island", 0.45, ["Interior cabinet cluster"]));
    } else {
      targets.push(makeTarget(mesh, "cabinet-finish", "perimeter", 0.45, ["Wall-adjacent cabinet cluster"]));
    }
  }
  return targets;
}

function buildZoneCounts(targets: V2MaterialTarget[]): V2ClassificationSummary["zoneCounts"] {
  const zones: V2MaterialZone[] = [
    "perimeter",
    "island",
    "tall",
    "hood",
    "countertops",
    "backsplash",
    "floor",
    "walls",
    "hardware",
    "plumbing",
    "appliances",
    "unknown",
  ];
  const counts = Object.fromEntries(
    zones.map((zone) => [
      zone,
      { assemblies: 0, meshes: 0, needsReview: 0 },
    ]),
  ) as V2ClassificationSummary["zoneCounts"];

  for (const target of targets) {
    const zone = target.zone ?? "unknown";
    counts[zone].meshes += 1;
    if (target.confidence < 0.5) {
      counts[zone].needsReview += 1;
    }
    const assemblyKey = target.assemblyId;
    counts[zone].assemblies += assemblyKey ? 1 : 0;
  }
  return counts;
}
