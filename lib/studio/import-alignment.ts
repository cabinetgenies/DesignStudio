import type { ModelBounds } from "./types";

export type ModelUnit = "mm" | "cm" | "m" | "in" | "ft";

export interface ImportAlignment {
  unit: ModelUnit;
  scaleCorrection: number;
  position: [number, number, number];
  rotation: [number, number, number];
  floorOffset: number;
  upAxis: "y" | "z";
  forward: "front" | "back" | "left" | "right";
  confirmed: boolean;
}

export const UNIT_TO_METERS: Record<ModelUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
};

export const DEFAULT_IMPORT_ALIGNMENT: ImportAlignment = {
  unit: "m",
  scaleCorrection: 1,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  floorOffset: 0,
  upAxis: "y",
  forward: "front",
  confirmed: false,
};

export function alignmentScale(alignment: ImportAlignment): number {
  return UNIT_TO_METERS[alignment.unit] * alignment.scaleCorrection;
}

export function scaledBounds(
  bounds: ModelBounds,
  alignment: ImportAlignment,
): { size: [number, number, number]; min: [number, number, number] } {
  const scale = alignmentScale(alignment);
  return {
    size: [bounds.size[0] * scale, bounds.size[1] * scale, bounds.size[2] * scale],
    min: [bounds.min[0] * scale, bounds.min[1] * scale, bounds.min[2] * scale],
  };
}

export function isImplausible(size: [number, number, number]): boolean {
  const [w, h, d] = size;
  return w < 0.2 || h < 0.2 || d < 0.2 || w > 30 || h > 20 || d > 30;
}

export function upAxisRotation(upAxis: "y" | "z"): [number, number, number] {
  if (upAxis === "z") {
    return [-Math.PI / 2, 0, 0];
  }
  return [0, 0, 0];
}

export function forwardRotation(forward: "front" | "back" | "left" | "right"): number {
  switch (forward) {
    case "front":
      return 0;
    case "back":
      return Math.PI;
    case "left":
      return Math.PI / 2;
    case "right":
      return -Math.PI / 2;
  }
}

export function alignmentRotation(
  alignment: ImportAlignment,
): [number, number, number] {
  return [
    upAxisRotation(alignment.upAxis)[0],
    forwardRotation(alignment.forward),
    0,
  ];
}

export function computeAlignedPosition(
  bounds: ModelBounds,
  alignment: ImportAlignment,
  floorY: number,
): [number, number, number] {
  const scale = alignmentScale(alignment);
  const min = scaledBounds(bounds, alignment).min;
  const centerX = bounds.center[0] * scale;
  const centerZ = bounds.center[2] * scale;
  return [
    -centerX,
    floorY - min[1] + alignment.floorOffset,
    -centerZ,
  ];
}
