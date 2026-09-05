import * as THREE from "three";
import type { RoomConfig, ViewMode } from "./transforms";
import {
  FRAME_ASPECT,
  FRAME_FOV,
  computeCameraPresets,
} from "./model-bounds";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  duration: number;
}

export interface Bounds {
  center: [number, number, number];
  size: [number, number, number];
}

export function computeHomePose(
  bounds: Bounds,
  fov: number = FRAME_FOV,
  aspect: number = FRAME_ASPECT,
): CameraPose {
  const preset = computeCameraPresets(bounds, fov, aspect).home;
  return { ...preset };
}

export function poseForView(
  view: ViewMode,
  bounds: Bounds,
): CameraPose {
  const presets = computeCameraPresets(bounds, FRAME_FOV, FRAME_ASPECT);
  switch (view) {
    case "plan":
      return presets.top;
    case "front":
      return presets.front;
    case "left":
      return presets.left;
    case "right":
      return presets.right;
    case "perspective":
    default:
      return presets.home;
  }
}

export function roomBounds(
  room: RoomConfig,
  center: [number, number, number] = [0, 0, 0],
): Bounds {
  return {
    center,
    size: [room.widthMeters, 2.6, room.depthMeters],
  };
}

export function computeWorldBounds(
  objects: THREE.Object3D[],
): Bounds | null {
  if (objects.length === 0) {
    return null;
  }

  const box = new THREE.Box3();
  for (const object of objects) {
    box.expandByObject(object);
  }

  if (box.isEmpty()) {
    return null;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
  };
}

export interface WallPlanes {
  x: number[];
  z: number[];
}

export function wallPlanesForRoom(
  room: RoomConfig,
  center: [number, number, number] = [0, 0, 0],
): WallPlanes {
  const halfWidth = room.widthMeters / 2;
  const halfDepth = room.depthMeters / 2;
  return {
    x: [center[0] - halfWidth, center[0] + halfWidth],
    z: [center[2] - halfDepth, center[2] + halfDepth],
  };
}

export function snapAxisToPlane(
  value: number,
  objectSize: number,
  planes: number[],
): number {
  let best = value;
  let bestDistance = Infinity;
  for (const plane of planes) {
    // Snap the object's nearest face to the plane.
    const offset = objectSize / 2;
    for (const sign of [1, -1]) {
      const candidate = plane + sign * offset;
      const distance = Math.abs(candidate - value);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best;
}

export function findByAppId(
  root: THREE.Object3D | null,
  appId: string,
): THREE.Object3D | null {
  if (!root) {
    return null;
  }
  let found: THREE.Object3D | null = null;
  root.traverse((object) => {
    if (found || object.userData.appId !== appId) {
      return;
    }
    found = object;
  });
  return found;
}

export function collectEditableObjects(root: THREE.Object3D | null): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  if (!root) {
    return objects;
  }
  root.traverse((object) => {
    if (object.userData.appId) {
      objects.push(object);
    }
  });
  return objects;
}
