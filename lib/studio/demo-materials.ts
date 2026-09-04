export interface DemoMaterialDef {
  label: string;
  color: string;
  roughness: number;
  metalness: number;
}

export type DemoMaterialKey =
  | "walls"
  | "perimeter"
  | "island"
  | "countertop"
  | "floor"
  | "appliance"
  | "hardware";

export const demoMaterials: Record<DemoMaterialKey, DemoMaterialDef> = {
  walls: { label: "Walls", color: "#f1eee9", roughness: 0.95, metalness: 0 },
  perimeter: {
    label: "Perimeter",
    color: "#e9e4db",
    roughness: 0.75,
    metalness: 0,
  },
  island: { label: "Island", color: "#5d5046", roughness: 0.65, metalness: 0 },
  countertop: {
    label: "Countertop",
    color: "#d8d4ce",
    roughness: 0.35,
    metalness: 0,
  },
  floor: { label: "Floor", color: "#cab8a4", roughness: 0.9, metalness: 0 },
  appliance: {
    label: "Appliances",
    color: "#43444b",
    roughness: 0.28,
    metalness: 0.8,
  },
  hardware: {
    label: "Hardware",
    color: "#292a2e",
    roughness: 0.4,
    metalness: 0.75,
  },
};
