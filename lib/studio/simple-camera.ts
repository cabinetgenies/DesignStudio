import type { ModelBounds } from "./types";

export type SimpleCameraView =
  | "reset"
  | "front"
  | "left"
  | "right"
  | "top"
  | "inside";

export interface SimpleCameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export interface SavedCameraPose extends SimpleCameraPose {
  modelIdentity: string;
  up: [number, number, number];
}

export function makeSimpleCameraPose(
  bounds: ModelBounds,
  view: SimpleCameraView,
): SimpleCameraPose {
  const center = bounds.center;
  const radius = Math.max(
    Math.hypot(bounds.size[0], bounds.size[1], bounds.size[2]) * 0.5,
    0.001,
  );
  const targetY = center[1] + radius * 0.35;
  const distance = radius * 1.8;
  const target: [number, number, number] = [
    center[0],
    targetY,
    center[2],
  ];

  const positions: Record<SimpleCameraView, [number, number, number]> = {
    reset: [
      center[0] + distance,
      center[1] + radius * 0.9,
      center[2] + distance,
    ],
    front: [center[0], targetY, center[2] + distance],
    left: [center[0] - distance, targetY, center[2]],
    right: [center[0] + distance, targetY, center[2]],
    top: [center[0], center[1] + radius * 2.2, center[2] + 0.01],
    inside: [center[0], center[1] + radius * 0.35, center[2] + radius * 0.7],
  };

  return { position: positions[view], target };
}

export function shouldApplyOneShotCommand(
  handledId: number | null,
  commandId: number,
): boolean {
  return handledId !== commandId;
}
