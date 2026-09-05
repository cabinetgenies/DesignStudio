import * as THREE from "three";
import type { CameraPreset } from "./camera-presets";
import type { CameraView, ModelBounds, StudioFocus } from "./types";

export interface BoundsLike {
  center: [number, number, number];
  size: [number, number, number];
}

export const FRAME_FOV = 42;
export const FRAME_ASPECT = 1.2;

export function computeBounds(root: THREE.Object3D): ModelBounds {
  const box = new THREE.Box3().setFromObject(root);

  if (box.isEmpty()) {
    box.set(
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, 0.5),
    );
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  return {
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

export function computeFocus(bounds: BoundsLike): StudioFocus {
  const size = new THREE.Vector3(...bounds.size);
  return {
    center: bounds.center,
    radius: Math.max(size.length() * 0.5, 0.001),
  };
}

export function computeCameraPresets(
  bounds: BoundsLike,
  fov: number = FRAME_FOV,
  aspect: number = FRAME_ASPECT,
): Record<CameraView, CameraPreset> {
  const center = new THREE.Vector3(...bounds.center);
  const size = new THREE.Vector3(...bounds.size);
  const radius = Math.max(size.length() * 0.5, 0.001);

  const fovRad = THREE.MathUtils.degToRad(fov);
  const fitY = radius / Math.sin(fovRad / 2);
  const fitX = radius / (Math.sin(fovRad / 2) * aspect);
  const distance = Math.max(fitY, fitX, 0.001) * 1.4;

  const directions: Record<CameraView, THREE.Vector3> = {
    home: new THREE.Vector3(1, 0.8, 1).normalize(),
    front: new THREE.Vector3(0, 0, 1),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    top: new THREE.Vector3(0, 1, 0.01).normalize(),
  };

  const views: CameraView[] = ["home", "front", "left", "right", "top"];
  const result = {} as Record<CameraView, CameraPreset>;

  for (const view of views) {
    const direction = directions[view].clone().multiplyScalar(distance);
    const position = center.clone().add(direction);
    result[view] = {
      position: [position.x, position.y, position.z],
      target: [center.x, center.y, center.z],
      duration: 1.2,
    };
  }

  return result;
}
