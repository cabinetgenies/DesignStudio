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

function isDaeUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".dae");
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

export function useImportedModel(url: string | null): {
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

    if (!url) {
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
        sceneRef.current = null;
      }
      importMark("reset", { url: null });
      return;
    }

    const targetUrl: string = url;
    const useDae = isDaeUrl(targetUrl);
    importMark("start", { url: targetUrl, useDae });

    timeoutId = setTimeout(() => {
      if (cancelled || timedOut) {
        return;
      }
      timedOut = true;
      importMark("timeout", { url: targetUrl });
      setState({
        url: targetUrl,
        scene: null,
        model: null,
        editableObjects: [],
        error: "The DAE import timed out.",
      });
    }, 60000);

    async function load() {
      if (useDae) {
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
        return floorAndCenter(imported);
      }

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
          url: targetUrl,
          meshes: loadedScene.children.length,
        });
        setState({
          url,
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
        importMark("error", { url: targetUrl, error: loadError });
        setState({
          url,
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
  }, [url]);

  useEffect(() => {
    return () => {
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
        sceneRef.current = null;
      }
    };
  }, []);

  const isCurrent = url !== null && state.url === url;

  return {
    scene: isCurrent ? state.scene : null,
    sceneRef,
    model: isCurrent ? state.model : null,
    editableObjects: isCurrent ? state.editableObjects : [],
    loading: url !== null && !isCurrent,
    error: isCurrent ? state.error : null,
  };
}
