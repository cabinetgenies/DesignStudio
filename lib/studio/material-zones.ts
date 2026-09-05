export type MaterialZoneId =
  | "perimeter"
  | "island"
  | "tall-cabinets"
  | "hood"
  | "countertops"
  | "backsplash"
  | "floor"
  | "walls"
  | "hardware"
  | "plumbing"
  | "appliances"
  | "other";

export interface MaterialZoneDefinition {
  id: MaterialZoneId;
  label: string;
  color: string;
}

export type MaterialAssignments = Record<string, MaterialZoneId>;

export type ZoneMaterialSelections = Record<MaterialZoneId, string | null>;

export const MATERIAL_ZONES: MaterialZoneDefinition[] = [
  { id: "perimeter", label: "Perimeter Cabinets", color: "#8aa6c9" },
  { id: "island", label: "Island Cabinets", color: "#7fbfa5" },
  { id: "tall-cabinets", label: "Tall Cabinets", color: "#b59bc4" },
  { id: "hood", label: "Hood", color: "#c9c3b5" },
  { id: "countertops", label: "Countertops", color: "#d9c08a" },
  { id: "backsplash", label: "Backsplash", color: "#c39bd3" },
  { id: "floor", label: "Floor", color: "#b98f7a" },
  { id: "walls", label: "Walls", color: "#a7b0b8" },
  { id: "hardware", label: "Hardware", color: "#d1a054" },
  { id: "plumbing", label: "Plumbing Fixtures", color: "#7fa8b8" },
  { id: "appliances", label: "Appliances", color: "#6f7d8c" },
  { id: "other", label: "Other", color: "#9aa0a6" },
];

export const zoneById: Record<MaterialZoneId, MaterialZoneDefinition> =
  Object.fromEntries(MATERIAL_ZONES.map((zone) => [zone.id, zone])) as Record<
    MaterialZoneId,
    MaterialZoneDefinition
  >;

export const emptyZoneSelections: ZoneMaterialSelections = {
  perimeter: null,
  island: null,
  "tall-cabinets": null,
  hood: null,
  countertops: null,
  backsplash: null,
  floor: null,
  walls: null,
  hardware: null,
  plumbing: null,
  appliances: null,
  other: null,
};

export const demoMeshZones: Record<string, MaterialZoneId> = {
  "perimeter-base-left": "perimeter",
  "perimeter-base-right": "perimeter",
  "perimeter-tall": "perimeter",
  "perimeter-side-base": "perimeter",
  "perimeter-wall-left": "perimeter",
  "perimeter-wall-right": "perimeter",
  "island-base": "island",
  "counter-back-left": "countertops",
  "counter-back-right": "countertops",
  "counter-side": "countertops",
  "counter-island": "countertops",
  "hardware-1": "hardware",
  "hardware-2": "hardware",
  "hardware-3": "hardware",
  "hardware-4": "hardware",
  "hardware-5": "hardware",
  "hardware-6": "hardware",
  "appliance-range": "appliances",
  "appliance-hood": "appliances",
};

export function computeZoneCounts(
  hasModel: boolean,
  assignments: MaterialAssignments,
  meshCount: number,
): { byZone: Record<MaterialZoneId, number>; unassigned: number } {
  const byZone: Record<MaterialZoneId, number> = {
    perimeter: 0,
    island: 0,
    "tall-cabinets": 0,
    hood: 0,
    countertops: 0,
    backsplash: 0,
    floor: 0,
    walls: 0,
    hardware: 0,
    plumbing: 0,
    appliances: 0,
    other: 0,
  };

  if (hasModel) {
    let assigned = 0;
    for (const zone of Object.values(assignments)) {
      byZone[zone] += 1;
      assigned += 1;
    }
    return { byZone, unassigned: Math.max(meshCount - assigned, 0) };
  }

  for (const name of Object.keys(demoMeshZones)) {
    const zone = assignments[name] ?? demoMeshZones[name];
    byZone[zone] += 1;
  }
  return { byZone, unassigned: 0 };
}
