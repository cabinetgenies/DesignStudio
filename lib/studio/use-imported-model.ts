"use client";

import { useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import * as THREE from "three";
import {
  disposeObject,
  inspectModel,
  type InspectedModel,
} from "./model-inspection";
import type { EditableObjectInfo } from "./editable-objects";
import type { ImportedModelSource } from "./imported-model-source";
import { selectLoader } from "./loader-selection";
import { applyColladaPatches } from "./collada-patches";

applyColladaPatches();

const DEBUG_IMPORT = process.env.NODE_ENV !== "production";

function importMark(stage: string, detail: unknown) {
  if (!DEBUG_IMPORT) {
    return;
  }
  console.debug(`[useImportedModel:${stage}]`, detail);
}

interface ImportedModelState {
  url: string;
  scene: THREE.Group | null;
  model: InspectedModel | null;
  editableObjects: EditableObjectInfo[];
  error: string | null;
}

function prepareEditableObjects(root: THREE.Object3D): EditableObjectInfo[] {
  const editableObjects: EditableObjectInfo[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const group = object as THREE.Group;
    if (!mesh.isMesh && !group.isGroup) {
      return;
    }
    const box = new THREE.Box3().setFromObject(object);
    const size = box.isEmpty()
      ? new THREE.Vector3(0.01, 0.01, 0.01)
      : box.getSize(new THREE.Vector3());
    editableObjects.push({
      id: object.uuid,
      name: object.name || object.type,
      size: [size.x, size.y, size.z],
      originalPosition: [
        object.position.x,
        object.position.y,
        object.position.z,
      ],
      originalRotation: [
        object.rotation.x,
        object.rotation.y,
        object.rotation.z,
      ],
      isDemo: false,
    });
  });
  return editableObjects;
}

function floorAndCenter(root: THREE.Object3D): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = root.name || "Imported model";
  wrapper.add(root);
  wrapper.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(wrapper);
  if (bounds.isEmpty()) {
    return wrapper;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const min = bounds.min;
  wrapper.position.x = -center.x;
  wrapper.position.z = -center.z;
  wrapper.position.y = -min.y;
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

function ensureRenderableMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    const fallback = () =>
      new THREE.MeshStandardMaterial({
        color: 0x9a948c,
        roughness: 0.75,
        metalness: 0,
      });

    if (Array.isArray(mesh.material)) {
      const valid = mesh.material.filter(
        (material): material is THREE.Material =>
          Boolean(material) && "color" in material,
      );
      if (valid.length === 0) {
        mesh.material = fallback();
      } else if (valid.length !== mesh.material.length) {
        mesh.material = valid;
      }
      return;
    }

    if (!mesh.material || !("color" in mesh.material)) {
      mesh.material = fallback();
    }
  });
}

export function useImportedModel(source: ImportedModelSource | null): {
  scene: THREE.Group | null;
  sceneRef: { current: THREE.Group | null };
  model: InspectedModel | null;
  editableObjects: EditableObjectInfo[];
  loading: boolean;
  error: string | null;
} {
  const sceneRef = useRef<THREE.Group | null>(null);
  const [state, setState] = useState<ImportedModelState>({
    url: "",
    scene: null,
    model: null,
    editableObjects: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!source) {
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
        sceneRef.current = null;
      }
      importMark("reset", { source: null });
      return;
    }

    const targetUrl: string = source.url;
    const format = source.format;
    const loaderSelection = selectLoader(format);
    importMark("start", { format, url: targetUrl });

    timeoutId = setTimeout(() => {
      if (cancelled || timedOut) {
        return;
      }
      timedOut = true;
      importMark("timeout", { format, url: targetUrl });
      setState({
        url: targetUrl,
        scene: null,
        model: null,
        editableObjects: [],
        error: "The model import timed out.",
      });
    }, 60000);

    async function load() {
      if (loaderSelection === "collada") {
        const loader = new ColladaLoader();
        const collada = await loader.loadAsync(targetUrl);
        if (!collada || !collada.scene) {
          throw new Error("The DAE file did not produce a scene.");
        }
        const imported = collada.scene;
        imported.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        const prepared = floorAndCenter(imported);
        ensureRenderableMaterials(prepared);
        return prepared;
      }

      if (loaderSelection === "gltf") {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(targetUrl);
        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        return gltf.scene;
      }

      throw new Error(`Unsupported imported-model format: ${String(format)}`);
    }

    load()
      .then((loadedScene) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (timedOut) {
          disposeObject(loadedScene);
          return;
        }
        if (cancelled) {
          disposeObject(loadedScene);
          return;
        }

        if (sceneRef.current) {
          disposeObject(sceneRef.current);
        }

        sceneRef.current = loadedScene;
        importMark("success", {
          format,
          url: targetUrl,
          meshes: loadedScene.children.length,
        });
        setState({
          url: targetUrl,
          scene: loadedScene,
          model: inspectModel(loadedScene),
          editableObjects: prepareEditableObjects(loadedScene),
          error: null,
        });
      })
      .catch((loadError: unknown) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (timedOut) {
          return;
        }
        if (cancelled) {
          return;
        }
        importMark("error", { format, url: targetUrl, error: loadError });
        setState({
          url: targetUrl,
          scene: null,
          model: null,
          editableObjects: [],
          error:
            loadError instanceof Error
              ? loadError.message
              : "The model could not be loaded.",
        });
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [source]);

  useEffect(() => {
    return () => {
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
        sceneRef.current = null;
      }
    };
  }, []);

  const isCurrent = source !== null && state.url === source.url;

  return {
    scene: isCurrent ? state.scene : null,
    sceneRef,
    model: isCurrent ? state.model : null,
    editableObjects: isCurrent ? state.editableObjects : [],
    loading: source !== null && !isCurrent,
    error: isCurrent ? state.error : null,
  };
}
