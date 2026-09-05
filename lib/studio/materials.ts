import type { MaterialZoneId } from "./material-zones";

export interface StudioMaterial {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
}

const cabinetMaterials: StudioMaterial[] = [
  { id: "warm-white", label: "Warm White", color: "#f2eee6", roughness: 0.7, metalness: 0 },
  { id: "soft-cream", label: "Soft Cream", color: "#f0e4cb", roughness: 0.7, metalness: 0 },
  { id: "natural-oak", label: "Natural Oak", color: "#c8a173", roughness: 0.65, metalness: 0 },
  { id: "walnut", label: "Walnut", color: "#78502f", roughness: 0.6, metalness: 0 },
  { id: "sage", label: "Sage", color: "#a7b39d", roughness: 0.7, metalness: 0 },
  { id: "charcoal", label: "Charcoal", color: "#4b4d4f", roughness: 0.55, metalness: 0 },
  { id: "navy", label: "Navy", color: "#32415e", roughness: 0.55, metalness: 0 },
];

const countertopMaterials: StudioMaterial[] = [
  { id: "white-quartz", label: "White Quartz", color: "#f0efed", roughness: 0.3, metalness: 0 },
  { id: "calacatta", label: "Calacatta", color: "#eef0ec", roughness: 0.25, metalness: 0 },
  { id: "taj-mahal", label: "Taj Mahal", color: "#e6ddcc", roughness: 0.28, metalness: 0 },
  { id: "concrete-gray", label: "Concrete Gray", color: "#b9b8b4", roughness: 0.5, metalness: 0 },
  { id: "soapstone", label: "Soapstone", color: "#3f4643", roughness: 0.35, metalness: 0 },
];

const backsplashMaterials: StudioMaterial[] = [
  { id: "white", label: "White", color: "#f3f2f0", roughness: 0.5, metalness: 0 },
  { id: "warm-white", label: "Warm White", color: "#efe8dc", roughness: 0.5, metalness: 0 },
  { id: "light-gray", label: "Light Gray", color: "#d4d3d1", roughness: 0.5, metalness: 0 },
  { id: "natural-stone", label: "Natural Stone", color: "#cbb9a3", roughness: 0.55, metalness: 0 },
  { id: "dark", label: "Dark", color: "#3d3f42", roughness: 0.45, metalness: 0 },
];

const floorMaterials: StudioMaterial[] = [
  { id: "light-oak", label: "Light Oak", color: "#d9c3a5", roughness: 0.7, metalness: 0 },
  { id: "natural-oak", label: "Natural Oak", color: "#c6a678", roughness: 0.7, metalness: 0 },
  { id: "medium-oak", label: "Medium Oak", color: "#a97f52", roughness: 0.7, metalness: 0 },
  { id: "dark-oak", label: "Dark Oak", color: "#6f4e2e", roughness: 0.65, metalness: 0 },
  { id: "light-tile", label: "Light Tile", color: "#d8d2c8", roughness: 0.4, metalness: 0 },
];

const wallMaterials: StudioMaterial[] = [
  { id: "warm-white", label: "Warm White", color: "#f1ede6", roughness: 0.95, metalness: 0 },
  { id: "soft-white", label: "Soft White", color: "#f7f5f1", roughness: 0.95, metalness: 0 },
  { id: "greige", label: "Greige", color: "#c8bfb2", roughness: 0.95, metalness: 0 },
  { id: "light-gray", label: "Light Gray", color: "#d6d4d2", roughness: 0.95, metalness: 0 },
];

const hardwareMaterials: StudioMaterial[] = [
  { id: "brushed-brass", label: "Brushed Brass", color: "#c3a06a", roughness: 0.35, metalness: 1 },
  { id: "matte-black", label: "Matte Black", color: "#27272a", roughness: 0.4, metalness: 0.8 },
  { id: "polished-chrome", label: "Polished Chrome", color: "#d9dde2", roughness: 0.15, metalness: 1 },
  { id: "brushed-nickel", label: "Brushed Nickel", color: "#b9b6b2", roughness: 0.3, metalness: 1 },
];

export const materialsByZone: Record<MaterialZoneId, StudioMaterial[]> = {
  perimeter: cabinetMaterials,
  "tall-cabinets": cabinetMaterials,
  hood: [
    { id: "stainless", label: "Stainless", color: "#c9c9c9", roughness: 0.25, metalness: 1 },
    { id: "black-hood", label: "Black", color: "#2b2b2b", roughness: 0.35, metalness: 0.8 },
    { id: "white-hood", label: "White", color: "#f0f0f0", roughness: 0.4, metalness: 0.3 },
  ],
  island: cabinetMaterials,
  countertops: countertopMaterials,
  backsplash: backsplashMaterials,
  floor: floorMaterials,
  walls: wallMaterials,
  hardware: hardwareMaterials,
  plumbing: hardwareMaterials,
  appliances: [],
  other: [],
};

export function getMaterial(
  zone: MaterialZoneId,
  id: string | null,
): StudioMaterial | null {
  if (!id) {
    return null;
  }
  return materialsByZone[zone].find((material) => material.id === id) ?? null;
}
