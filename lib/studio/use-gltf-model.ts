"use client";

import { useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  disposeObject,
  inspectModel,
  type InspectedModel,
} from "./model-inspection";
import type { EditableObjectInfo } from "./editable-objects";

interface GlbState {
  url: string;
  scene: THREE.Group | null;
  model: InspectedModel | null;
  editableObjects: EditableObjectInfo[];
  error: string | null;
}

export function useGlbModel(url: string | null): {
  scene: THREE.Group | null;
  sceneRef: { current: THREE.Group | null };
  model: InspectedModel | null;
  editableObjects: EditableObjectInfo[];
  loading: boolean;
  error: string | null;
} {
  const sceneRef = useRef<THREE.Group | null>(null);
  const [state, setState] = useState<GlbState>({
    url: "",
    scene: null,
    model: null,
    editableObjects: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!url) {
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
        sceneRef.current = null;
      }
      return;
    }

    const loader = new GLTFLoader();

    loader
      .loadAsync(url)
      .then((gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }

        if (sceneRef.current) {
          disposeObject(sceneRef.current);
        }

        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        sceneRef.current = gltf.scene;
        const editableObjects: EditableObjectInfo[] = [];
        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh && !(object as THREE.Group).isGroup) {
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
        setState({
          url,
          scene: gltf.scene,
          model: inspectModel(gltf.scene),
          editableObjects,
          error: null,
        });
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
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
