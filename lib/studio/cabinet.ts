export type CabinetCategory =
  | "base"
  | "wall"
  | "tall"
  | "sink-base"
  | "drawer-base"
  | "appliance";

export type CabinetFrontType =
  | "door"
  | "double-door"
  | "drawer"
  | "drawer-stack"
  | "door-drawer"
  | "open";

import type { MaterialZoneId } from "./material-zones";

export interface CabinetInstance {
  id: string;
  catalogId: string;
  name: string;
  category: CabinetCategory;
  widthM: number;
  heightM: number;
  depthM: number;
  position: [number, number, number];
  rotation: [number, number, number];
  frontType: CabinetFrontType;
  doorCount: number;
  drawerCount: number;
  handing?: "left" | "right" | "none";
  locked: boolean;
  hidden: boolean;
  finishZone: MaterialZoneId | null;
  materialZoneIds: {
    box: string;
    fronts: string;
    hardware: string;
  };
}

export interface CabinetCatalogEntry {
  catalogId: string;
  sku: string;
  name: string;
  category: CabinetCategory;
  widthM: number;
  heightM: number;
  depthM: number;
  widthRangeM: [number, number];
  frontType: CabinetFrontType;
  doorCount: number;
  drawerCount: number;
  handing?: "left" | "right" | "none";
  tags: string[];
}

const IN = 0.0254;

function entry(
  catalogId: string,
  category: CabinetCategory,
  widthIn: number,
  heightIn: number,
  depthIn: number,
  frontType: CabinetFrontType,
  doorCount: number,
  drawerCount: number,
  tags: string[] = [],
): CabinetCatalogEntry {
  return {
    catalogId,
    sku: `CG-${catalogId}`,
    name: `${catalogId} ${category}`,
    category,
    widthM: widthIn * IN,
    heightM: heightIn * IN,
    depthM: depthIn * IN,
    widthRangeM: [Math.max(0.15, widthIn * IN * 0.75), widthIn * IN * 1.5],
    frontType,
    doorCount,
    drawerCount,
    tags,
  };
}

const BASE_H = 34.5;
const BASE_D = 24;
const WALL_H = 30;
const WALL_D = 12;
const TALL_H = 84;
const TALL_D = 24;

export const CABINET_CATALOG: CabinetCatalogEntry[] = [
  ...["12", "18", "24", "30", "36"].map((w) =>
    entry(`B${w}`, "base", Number(w), BASE_H, BASE_D, "door", 1, 0),
  ),
  ...["18", "24", "30", "36"].map((w) =>
    entry(`DB${w}`, "drawer-base", Number(w), BASE_H, BASE_D, "drawer-stack", 0, 3),
  ),
  ...["30", "33", "36"].map((w) =>
    entry(`SB${w}`, "sink-base", Number(w), BASE_H, BASE_D, "double-door", 2, 0),
  ),
  ...["12", "18", "24", "30", "36"].map((w) =>
    entry(`W${w}`, "wall", Number(w), WALL_H, WALL_D, "door", 1, 0),
  ),
  ...["18", "24", "30", "36"].map((w) =>
    entry(`T${w}`, "tall", Number(w), TALL_H, TALL_D, "double-door", 2, 0),
  ),
];

export function getCatalogEntry(
  catalogId: string,
): CabinetCatalogEntry | undefined {
  return CABINET_CATALOG.find((entry) => entry.catalogId === catalogId);
}

export function createCabinetInstance(
  catalogId: string,
  id: string,
  position: [number, number, number] = [0, 0, 0],
): CabinetInstance | null {
  const catalog = getCatalogEntry(catalogId);
  if (!catalog) {
    return null;
  }
  return {
    id,
    catalogId,
    name: catalog.name,
    category: catalog.category,
    widthM: catalog.widthM,
    heightM: catalog.heightM,
    depthM: catalog.depthM,
    position,
    rotation: [0, 0, 0],
    frontType: catalog.frontType,
    doorCount: catalog.doorCount,
    drawerCount: catalog.drawerCount,
    handing: catalog.handing,
    locked: false,
    hidden: false,
    finishZone: null,
    materialZoneIds: {
      box: "cabinet-box",
      fronts: "cabinet-fronts",
      hardware: "cabinet-hardware",
    },
  };
}

export function validateCabinetInstance(
  cabinet: CabinetInstance,
): { id: string; severity: "warning" | "error"; message: string }[] {
  const findings: { id: string; severity: "warning" | "error"; message: string }[] =
    [];
  if (
    !Number.isFinite(cabinet.widthM) ||
    cabinet.widthM <= 0 ||
    !Number.isFinite(cabinet.heightM) ||
    cabinet.heightM <= 0 ||
    !Number.isFinite(cabinet.depthM) ||
    cabinet.depthM <= 0
  ) {
    findings.push({
      id: `${cabinet.id}-dim`,
      severity: "error",
      message: "Invalid cabinet dimensions",
    });
  }
  return findings;
}

export function cabinetFootprint(
  cabinet: CabinetInstance,
): {
  center: [number, number];
  corners: [number, number][];
  edges: { a: [number, number]; b: [number, number] }[];
} {
  const halfW = cabinet.widthM / 2;
  const halfD = cabinet.depthM / 2;
  const cos = Math.cos(cabinet.rotation[1]);
  const sin = Math.sin(cabinet.rotation[1]);
  const local: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];
  const corners = local.map(
    ([x, z]) =>
      [
        cabinet.position[0] + x * cos - z * sin,
        cabinet.position[2] + x * sin + z * cos,
      ] as [number, number],
  );
  const edges = corners.map((corner, index) => ({
    a: corner,
    b: corners[(index + 1) % corners.length],
  }));
  return { center: [cabinet.position[0], cabinet.position[2]], corners, edges };
}
