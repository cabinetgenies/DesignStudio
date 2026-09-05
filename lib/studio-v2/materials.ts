export type V2MaterialZone =
  | "perimeter"
  | "island"
  | "tall"
  | "hood"
  | "countertops"
  | "backsplash"
  | "floor"
  | "walls"
  | "hardware"
  | "plumbing"
  | "appliances"
  | "unknown";

export interface V2Material {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  textureScale: number;
}

export const V2_ZONE_LABELS: Record<V2MaterialZone, string> = {
  perimeter: "Perimeter Cabinets",
  island: "Island Cabinets",
  tall: "Tall Cabinets",
  hood: "Hood",
  countertops: "Countertops",
  backsplash: "Backsplash",
  floor: "Flooring",
  walls: "Walls",
  hardware: "Hardware",
  plumbing: "Plumbing",
  appliances: "Appliances",
  unknown: "Other",
};

export const V2_MATERIALS: Record<V2MaterialZone, V2Material[]> = {
  perimeter: [
    { id: "warm-white", label: "Warm White", color: "#f2eee6", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "soft-cream", label: "Soft Cream", color: "#f0e4cb", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "natural-white-oak", label: "Natural White Oak", color: "#c8a173", roughness: 0.65, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "medium-walnut", label: "Medium Walnut", color: "#78502f", roughness: 0.6, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "sage", label: "Sage", color: "#a7b39d", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "charcoal", label: "Charcoal", color: "#4b4d4f", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "navy", label: "Navy", color: "#32415e", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
  island: [
    { id: "warm-white", label: "Warm White", color: "#f2eee6", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "soft-cream", label: "Soft Cream", color: "#f0e4cb", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "natural-white-oak", label: "Natural White Oak", color: "#c8a173", roughness: 0.65, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "medium-walnut", label: "Medium Walnut", color: "#78502f", roughness: 0.6, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "sage", label: "Sage", color: "#a7b39d", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "charcoal", label: "Charcoal", color: "#4b4d4f", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "navy", label: "Navy", color: "#32415e", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
  tall: [
    { id: "warm-white", label: "Warm White", color: "#f2eee6", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "soft-cream", label: "Soft Cream", color: "#f0e4cb", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "natural-white-oak", label: "Natural White Oak", color: "#c8a173", roughness: 0.65, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "medium-walnut", label: "Medium Walnut", color: "#78502f", roughness: 0.6, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "sage", label: "Sage", color: "#a7b39d", roughness: 0.7, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "charcoal", label: "Charcoal", color: "#4b4d4f", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "navy", label: "Navy", color: "#32415e", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
  hood: [
    { id: "stainless", label: "Stainless Steel", color: "#c9c9c9", roughness: 0.25, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
    { id: "matte-black", label: "Matte Black", color: "#2b2b2b", roughness: 0.4, metalness: 0.8, envMapIntensity: 0.6, textureScale: 1 },
    { id: "white", label: "White", color: "#f0f0f0", roughness: 0.4, metalness: 0.3, envMapIntensity: 0.3, textureScale: 1 },
  ],
  countertops: [
    { id: "white-quartz", label: "White Quartz", color: "#f0efed", roughness: 0.3, metalness: 0, envMapIntensity: 0.25, textureScale: 1 },
    { id: "calacatta", label: "Calacatta", color: "#eef0ec", roughness: 0.25, metalness: 0, envMapIntensity: 0.25, textureScale: 1 },
    { id: "taj-mahal", label: "Taj Mahal", color: "#e6ddcc", roughness: 0.28, metalness: 0, envMapIntensity: 0.25, textureScale: 1 },
    { id: "concrete-gray", label: "Concrete Gray", color: "#b9b8b4", roughness: 0.5, metalness: 0, envMapIntensity: 0.25, textureScale: 1 },
    { id: "soapstone", label: "Soapstone", color: "#3f4643", roughness: 0.35, metalness: 0, envMapIntensity: 0.25, textureScale: 1 },
  ],
  backsplash: [
    { id: "warm-white", label: "Warm White", color: "#f1ede6", roughness: 0.5, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "soft-white", label: "Soft White", color: "#f7f5f1", roughness: 0.5, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "greige", label: "Greige", color: "#c8bfb2", roughness: 0.5, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "light-gray", label: "Light Gray", color: "#d6d4d2", roughness: 0.5, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "natural-stone", label: "Natural Stone", color: "#cbb9a3", roughness: 0.55, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
    { id: "dark-tile", label: "Dark Tile", color: "#3d3f42", roughness: 0.45, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
  floor: [
    { id: "light-oak", label: "Light Oak", color: "#d9c3a5", roughness: 0.7, metalness: 0, envMapIntensity: 0.15, textureScale: 1 },
    { id: "natural-oak", label: "Natural Oak", color: "#c6a678", roughness: 0.7, metalness: 0, envMapIntensity: 0.15, textureScale: 1 },
    { id: "medium-oak", label: "Medium Oak", color: "#a97f52", roughness: 0.7, metalness: 0, envMapIntensity: 0.15, textureScale: 1 },
    { id: "dark-oak", label: "Dark Oak", color: "#6f4e2e", roughness: 0.65, metalness: 0, envMapIntensity: 0.15, textureScale: 1 },
    { id: "light-porcelain", label: "Light Porcelain", color: "#d8d2c8", roughness: 0.4, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
  walls: [
    { id: "warm-white", label: "Warm White", color: "#f1ede6", roughness: 0.95, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
    { id: "soft-white", label: "Soft White", color: "#f7f5f1", roughness: 0.95, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
    { id: "greige", label: "Greige", color: "#c8bfb2", roughness: 0.95, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
    { id: "light-gray", label: "Light Gray", color: "#d6d4d2", roughness: 0.95, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
    { id: "natural-stone", label: "Natural Stone", color: "#cbb9a3", roughness: 0.9, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
    { id: "dark-tile", label: "Dark Tile", color: "#3d3f42", roughness: 0.85, metalness: 0, envMapIntensity: 0.1, textureScale: 1 },
  ],
  hardware: [
    { id: "brushed-brass", label: "Brushed Brass", color: "#c3a06a", roughness: 0.35, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
    { id: "matte-black", label: "Matte Black", color: "#27272a", roughness: 0.4, metalness: 0.8, envMapIntensity: 0.6, textureScale: 1 },
    { id: "polished-chrome", label: "Polished Chrome", color: "#d9dde2", roughness: 0.15, metalness: 1, envMapIntensity: 0.9, textureScale: 1 },
    { id: "brushed-nickel", label: "Brushed Nickel", color: "#b9b6b2", roughness: 0.3, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
  ],
  plumbing: [
    { id: "brushed-brass", label: "Brushed Brass", color: "#c3a06a", roughness: 0.35, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
    { id: "matte-black", label: "Matte Black", color: "#27272a", roughness: 0.4, metalness: 0.8, envMapIntensity: 0.6, textureScale: 1 },
    { id: "polished-chrome", label: "Polished Chrome", color: "#d9dde2", roughness: 0.15, metalness: 1, envMapIntensity: 0.9, textureScale: 1 },
    { id: "brushed-nickel", label: "Brushed Nickel", color: "#b9b6b2", roughness: 0.3, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
  ],
  appliances: [
    { id: "stainless", label: "Stainless Steel", color: "#c9c9c9", roughness: 0.25, metalness: 1, envMapIntensity: 0.8, textureScale: 1 },
    { id: "matte-black", label: "Matte Black", color: "#2b2b2b", roughness: 0.4, metalness: 0.8, envMapIntensity: 0.6, textureScale: 1 },
    { id: "white", label: "White", color: "#f0f0f0", roughness: 0.4, metalness: 0.3, envMapIntensity: 0.3, textureScale: 1 },
  ],
  unknown: [
    { id: "neutral-gray", label: "Light Gray", color: "#c9c8c6", roughness: 0.8, metalness: 0, envMapIntensity: 0.2, textureScale: 1 },
  ],
};

export function getV2Material(
  zone: V2MaterialZone,
  id: string,
): V2Material | null {
  return V2_MATERIALS[zone].find((material) => material.id === id) ?? null;
}
