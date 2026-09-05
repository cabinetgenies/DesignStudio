import type { TransformState } from "./transforms";

export interface EditableObjectInfo {
  id: string;
  name: string;
  size: [number, number, number];
  originalPosition: [number, number, number];
  originalRotation: [number, number, number];
  isDemo: boolean;
  duplicateSourceId?: string;
}

export function initialTransform(
  info: EditableObjectInfo,
): TransformState {
  return {
    position: info.originalPosition,
    rotation: info.originalRotation,
    locked: false,
    hidden: false,
  };
}

export const DEMO_EDITABLE_OBJECTS: EditableObjectInfo[] = [
  {
    id: "island-base",
    name: "Island",
    size: [1.4, 0.82, 0.8],
    originalPosition: [0, 0.41, 0.45],
    originalRotation: [0, 0, 0],
    isDemo: true,
  },
  {
    id: "perimeter-base-left",
    name: "Base Cabinet — Left",
    size: [1.1, 0.82, 0.58],
    originalPosition: [-0.65, 0.41, -2.07],
    originalRotation: [0, 0, 0],
    isDemo: true,
  },
  {
    id: "perimeter-base-right",
    name: "Base Cabinet — Right",
    size: [1.1, 0.82, 0.58],
    originalPosition: [0.65, 0.41, -2.07],
    originalRotation: [0, 0, 0],
    isDemo: true,
  },
  {
    id: "perimeter-side-base",
    name: "Base Cabinet — Side",
    size: [0.58, 0.82, 1.4],
    originalPosition: [-1.46, 0.41, -0.8],
    originalRotation: [0, 0, 0],
    isDemo: true,
  },
];

export function isDemoEditableId(id: string): boolean {
  return DEMO_EDITABLE_OBJECTS.some((object) => object.id === id);
}
