import * as THREE from "three";
import { computeBounds } from "./model-bounds";
import type { ModelInfo, SceneNodeInfo } from "./types";

export interface InspectedModel {
  info: ModelInfo;
  tree: SceneNodeInfo[];
  nodeMap: Map<string, THREE.Object3D>;
}

export function inspectModel(root: THREE.Object3D): InspectedModel {
  let meshCount = 0;
  let groupCount = 0;
  const materials = new Set<THREE.Material>();
  const nodeMap = new Map<string, THREE.Object3D>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      object.userData.appId = object.uuid;
      meshCount += 1;
      const materialList = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materialList) {
        if (material) {
          materials.add(material);
        }
      }
      return;
    }

    object.userData.appId = object.uuid;
    if (
      object !== root &&
      (object.type === "Group" || object.type === "Object3D")
    ) {
      groupCount += 1;
    }
  });

  function buildNode(object: THREE.Object3D): SceneNodeInfo {
    nodeMap.set(object.uuid, object);
    const mesh = object as THREE.Mesh;
    const children = object.children.map(buildNode);
    const hasMaterial = mesh.isMesh
      ? Array.isArray(mesh.material)
        ? mesh.material.length > 0
        : Boolean(mesh.material)
      : false;
    const childMeshCount = children.reduce(
      (sum, child) => sum + child.meshCount,
      0,
    );

    return {
      id: object.uuid,
      name: object.name || object.type,
      type: object.type,
      isMesh: mesh.isMesh,
      hasMaterial,
      meshCount: (mesh.isMesh ? 1 : 0) + childMeshCount,
      children,
    };
  }
  const tree = root.children.map(buildNode);

  return {
    info: {
      rootName: root.name || "Model",
      meshCount,
      groupCount,
      materialCount: materials.size,
      bounds: computeBounds(root),
    },
    tree,
    nodeMap,
  };
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.geometry?.dispose();

    const materialList = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materialList) {
      if (!material) {
        continue;
      }
      for (const value of Object.values(material)) {
        if (value && (value as THREE.Texture).isTexture) {
          (value as THREE.Texture).dispose();
        }
      }
      material.dispose();
    }
  });
}
