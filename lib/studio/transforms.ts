import * as THREE from "three";

export const INCH_METERS = 0.0254;
export const FOOT_METERS = 0.3048;

export interface TransformState {
  position: [number, number, number];
  rotation: [number, number, number];
  locked: boolean;
  hidden: boolean;
}

export interface SnapConfig {
  enabled: boolean;
  translationInches: number;
  rotationDegrees: number;
  geometryTolerance: number;
  wallSnap: boolean;
  objectSnap: boolean;
  openingSnap: boolean;
  centerlineSnap: boolean;
}

export interface RoomConfig {
  widthMeters: number;
  depthMeters: number;
}

export type ViewMode = "perspective" | "plan" | "front" | "left" | "right";

export const TRANSLATION_SNAP_INCHES = [1, 3, 6];
export const ROTATION_SNAP_DEGREES = [15, 45, 90];

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: false,
  translationInches: 1,
  rotationDegrees: 15,
  geometryTolerance: 0.05,
  wallSnap: true,
  objectSnap: true,
  openingSnap: true,
  centerlineSnap: true,
};

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  widthMeters: 4.8,
  depthMeters: 4.8,
};

export const DEFAULT_TRANSFORM: TransformState = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  locked: false,
  hidden: false,
};

export function inchesToMeters(inches: number): number {
  return inches * INCH_METERS;
}

export function metersToInches(meters: number): number {
  return meters / INCH_METERS;
}

export function feetToMeters(feet: number): number {
  return feet * FOOT_METERS;
}

export function metersToFeet(meters: number): number {
  return meters / FOOT_METERS;
}

export function formatFeetInches(meters: number): string {
  const totalInches = Math.round(metersToInches(meters) * 8) / 8;
  const sign = totalInches < 0 ? "-" : "";
  const abs = Math.abs(totalInches);
  const feet = Math.floor(abs / 12);
  const inches = Math.round((abs - feet * 12) * 8) / 8;

  if (feet === 0 && inches === 0) {
    return "0\"";
  }
  if (feet === 0) {
    return `${sign}${inches}"`;
  }
  if (inches === 0) {
    return `${sign}${feet}'`;
  }
  return `${sign}${feet}' ${inches}"`;
}

export function formatMeters(meters: number): string {
  const rounded = Math.round(meters * 1000) / 1000;
  return `${rounded} m`;
}

export function snapToStep(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

export function snapEulerToDegrees(
  euler: THREE.Euler,
  degrees: number,
): THREE.Euler {
  const result = euler.clone();
  if (degrees > 0) {
    result.x = THREE.MathUtils.degToRad(
      snapToStep(THREE.MathUtils.radToDeg(euler.x), degrees),
    );
    result.y = THREE.MathUtils.degToRad(
      snapToStep(THREE.MathUtils.radToDeg(euler.y), degrees),
    );
    result.z = THREE.MathUtils.degToRad(
      snapToStep(THREE.MathUtils.radToDeg(euler.z), degrees),
    );
  }
  return result;
}

export function eulerToTuple(euler: THREE.Euler): [number, number, number] {
  return [euler.x, euler.y, euler.z];
}

export function vectorToTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export interface LocalTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface SceneApi {
  duplicate(sourceId: string, targetId: string): boolean;
  removeObject(appId: string): void;
  frameSelection(keys: string[]): void;
  frameRoom(bounds: {
    center: [number, number, number];
    size: [number, number, number];
  }): void;
}

export function readLocalTransform(
  object: THREE.Object3D,
): LocalTransform {
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
  };
}

export function applyWorldDelta(
  object: THREE.Object3D,
  delta: THREE.Matrix4,
  startWorld: THREE.Matrix4,
  parentInverse: THREE.Matrix4,
): void {
  const newWorld = delta.clone().multiply(startWorld);
  const local = parentInverse.clone().multiply(newWorld);
  local.decompose(object.position, object.quaternion, object.scale);
}
