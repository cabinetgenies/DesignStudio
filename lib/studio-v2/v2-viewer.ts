import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { applyColladaPatches } from "@/lib/studio/collada-patches";
import type { V2Assembly } from "./dae-classify";
import {
  getV2Material,
  type V2Material,
  type V2MaterialZone,
} from "./materials";

export type V2View = "reset" | "front" | "left" | "right" | "top" | "inside";

export interface V2CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export interface V2LoadResult {
  meshCount: number;
  visibleMeshCount: number;
  dimensions: [number, number, number];
}

export type V2MaterialSelections = Partial<Record<V2MaterialZone, string>>;

const NEUTRAL = 0x9a948c;

export class V2Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private modelRoot: THREE.Group | null = null;
  private animationId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement;
  private loader: ColladaLoader;
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private overrideClones = new Map<string, THREE.Material | THREE.Material[]>();
  private zoneMeshes = new Map<V2MaterialZone, THREE.Mesh[]>();

  constructor(container: HTMLElement) {
    applyColladaPatches();
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#f4f1ec");

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    this.camera.position.set(0, 6, 9);
    this.camera.lookAt(0, 1, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 80;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.target.set(0, 1, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cc, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 2.2);
    dir.position.set(5, 8, 4);
    dir.castShadow = true;
    this.scene.add(dir);

    this.loader = new ColladaLoader();

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animate();
  }

  private resize() {
    const width =
      this.container.clientWidth ||
      this.container.parentElement?.clientWidth ||
      window.innerWidth ||
      1;
    const height =
      this.container.clientHeight ||
      this.container.parentElement?.clientHeight ||
      window.innerHeight ||
      1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  loadDae(xml: string, assemblies: V2Assembly[] = []): V2LoadResult {
    const collada = this.loader.parse(xml, "");
    if (!collada || !collada.scene) {
      throw new Error("The DAE file did not produce a scene.");
    }

    this.clearModelOnly();
    const imported = collada.scene;
    imported.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        ensureNeutralMaterial(mesh);
      }
    });

    const wrapper = new THREE.Group();
    wrapper.name = "Imported DAE";
    wrapper.add(imported);
    wrapper.updateMatrixWorld(true);
    this.normalizeWrapper(wrapper);

    this.modelRoot = wrapper;
    this.scene.add(wrapper);
    this.buildSceneIndex(wrapper, assemblies);
    this.frame(wrapper);

    const counts = countMeshes(wrapper);
    return counts;
  }

  private buildSceneIndex(root: THREE.Object3D, assemblies: V2Assembly[]) {
    this.originalMaterials.clear();
    this.overrideClones.clear();
    this.zoneMeshes.clear();

    const zoneByName = new Map<string, V2MaterialZone>();
    for (const assembly of assemblies) {
      if (assembly.proposedZone) {
        zoneByName.set(assembly.name, assembly.proposedZone);
      }
    }

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const key = mesh.uuid;
      this.originalMaterials.set(
        key,
        Array.isArray(mesh.material) ? mesh.material.slice() : mesh.material,
      );

      let zone: V2MaterialZone | null = null;
      let parent: THREE.Object3D | null = mesh.parent;
      while (parent && !zone) {
        const match = zoneByName.get(parent.name);
        if (match) {
          zone = match;
        } else {
          parent = parent.parent;
        }
      }
      if (!zone) {
        zone = zoneByName.get(mesh.name) ?? null;
      }
      if (zone) {
        const list = this.zoneMeshes.get(zone) ?? [];
        list.push(mesh);
        this.zoneMeshes.set(zone, list);
      }
    });
  }

  clearModel() {
    this.clearModelOnly();
    this.resetView();
  }

  private clearModelOnly() {
    if (this.modelRoot) {
      for (const mesh of this.collectAllMeshes(this.modelRoot)) {
        this.restoreMeshOriginal(mesh);
      }
      this.scene.remove(this.modelRoot);
      disposeObject(this.modelRoot);
      this.modelRoot = null;
    }
    this.originalMaterials.clear();
    this.overrideClones.clear();
    this.zoneMeshes.clear();
  }

  private collectAllMeshes(root: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        meshes.push(mesh);
      }
    });
    return meshes;
  }

  private normalizeWrapper(wrapper: THREE.Group) {
    const bounds = new THREE.Box3().setFromObject(wrapper);
    if (bounds.isEmpty()) {
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    wrapper.position.x = -center.x;
    wrapper.position.z = -center.z;
    wrapper.position.y = -bounds.min.y;
    wrapper.updateMatrixWorld(true);
  }

  private frame(wrapper: THREE.Group) {
    const bounds = new THREE.Box3().setFromObject(wrapper);
    if (bounds.isEmpty()) {
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.5, 0.001);
    this.controls.target.copy(center).y += radius * 0.35;
    this.camera.position.set(
      center.x + radius * 1.8,
      center.y + radius * 0.9,
      center.z + radius * 1.8,
    );
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  resetView() {
    if (this.modelRoot) {
      this.frame(this.modelRoot);
    } else {
      this.controls.target.set(0, 1, 0);
      this.camera.position.set(0, 6, 9);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
    }
  }

  setView(view: V2View) {
    if (view === "reset") {
      this.resetView();
      return;
    }
    if (!this.modelRoot) {
      return;
    }
    const bounds = new THREE.Box3().setFromObject(this.modelRoot);
    if (bounds.isEmpty()) {
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.5, 0.001);
    const target = center.clone();
    target.y += radius * 0.35;
    const distance = radius * 1.8;

    const positions: Record<Exclude<V2View, "reset">, THREE.Vector3> = {
      front: new THREE.Vector3(center.x, target.y, center.z + distance),
      left: new THREE.Vector3(center.x - distance, target.y, center.z),
      right: new THREE.Vector3(center.x + distance, target.y, center.z),
      top: new THREE.Vector3(center.x, center.y + radius * 2.2, center.z + 0.01),
      inside: new THREE.Vector3(center.x, center.y + radius * 0.35, center.z + radius * 0.7),
    };
    this.camera.position.copy(positions[view]);
    this.controls.target.copy(target);
    this.controls.update();
  }

  getCameraPose(): V2CameraPose {
    return {
      position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      target: [this.controls.target.x, this.controls.target.y, this.controls.target.z],
    };
  }

  setZoneMaterial(zone: V2MaterialZone, materialId: string) {
    const material = getV2Material(zone, materialId);
    const meshes = this.zoneMeshes.get(zone) ?? [];
    for (const mesh of meshes) {
      this.applyMaterialToMesh(mesh, material);
    }
  }

  clearZoneMaterial(zone: V2MaterialZone) {
    const meshes = this.zoneMeshes.get(zone) ?? [];
    for (const mesh of meshes) {
      this.restoreMeshOriginal(mesh);
    }
  }

  restoreAllMaterials() {
    const meshes = new Set<THREE.Mesh>();
    for (const list of this.zoneMeshes.values()) {
      for (const mesh of list) {
        meshes.add(mesh);
      }
    }
    for (const mesh of meshes) {
      this.restoreMeshOriginal(mesh);
    }
  }

  applyMaterialSelections(selections: V2MaterialSelections) {
    for (const [zone, materialId] of Object.entries(selections) as [
      V2MaterialZone,
      string,
    ][]) {
      if (materialId) {
        this.setZoneMaterial(zone, materialId);
      } else {
        this.clearZoneMaterial(zone);
      }
    }
  }

  highlightZone(zone: V2MaterialZone | null) {
    for (const [currentZone, meshes] of this.zoneMeshes.entries()) {
      const active = zone !== null && currentZone === zone;
      for (const mesh of meshes) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const material of materials) {
          if (!material) {
            continue;
          }
          if ("emissive" in material) {
            const standard = material as THREE.MeshStandardMaterial;
            standard.emissive.set(active ? "#3b82f6" : "#000000");
            standard.emissiveIntensity = active ? 0.35 : 0;
          }
        }
      }
    }
  }

  private applyMaterialToMesh(mesh: THREE.Mesh, material: V2Material | null) {
    const key = mesh.uuid;
    this.disposeOverrides(mesh);
    const original = this.originalMaterials.get(key);
    if (!original) {
      return;
    }
    const isArray = Array.isArray(original);
    const originals = isArray ? original : [original];
    const clones = originals.map((source) => {
      if (!source || !material) {
        return source;
      }
      const clone = source.clone();
      if ("color" in clone) {
        (clone as THREE.MeshStandardMaterial).color.set(material.color);
      }
      if ("roughness" in clone) {
        (clone as THREE.MeshStandardMaterial).roughness = material.roughness;
      }
      if ("metalness" in clone) {
        (clone as THREE.MeshStandardMaterial).metalness = material.metalness;
      }
      if ("envMapIntensity" in clone) {
        (clone as THREE.MeshStandardMaterial).envMapIntensity =
          material.envMapIntensity;
      }
      clone.needsUpdate = true;
      return clone;
    });
    mesh.material = isArray ? clones : clones[0];
    this.overrideClones.set(key, mesh.material);
  }

  private restoreMeshOriginal(mesh: THREE.Mesh) {
    const key = mesh.uuid;
    this.disposeOverrides(mesh);
    const original = this.originalMaterials.get(key);
    if (original !== undefined) {
      mesh.material = original;
    }
  }

  private disposeOverrides(mesh: THREE.Mesh) {
    const key = mesh.uuid;
    const previous = this.overrideClones.get(key);
    if (previous) {
      const materials = Array.isArray(previous) ? previous : [previous];
      for (const material of materials) {
        if (material) {
          material.dispose();
        }
      }
      this.overrideClones.delete(key);
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this.clearModelOnly();
    this.originalMaterials.clear();
    this.overrideClones.clear();
    this.zoneMeshes.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function ensureNeutralMaterial(mesh: THREE.Mesh) {
  const fallback = () =>
    new THREE.MeshStandardMaterial({
      color: NEUTRAL,
      roughness: 0.75,
      metalness: 0,
    });
  const isDark = (material: THREE.Material) => {
    const color = (material as THREE.MeshStandardMaterial).color;
    return Boolean(color) && color.r + color.g + color.b < 0.06;
  };

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) =>
      !material || !("color" in material) || isDark(material)
        ? fallback()
        : material,
    );
  } else if (
    !mesh.material ||
    !("color" in mesh.material) ||
    isDark(mesh.material)
  ) {
    mesh.material = fallback();
  }
}

function countMeshes(root: THREE.Object3D): V2LoadResult {
  let meshCount = 0;
  let visibleMeshCount = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount += 1;
      if (mesh.visible) {
        visibleMeshCount += 1;
      }
    }
  });
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.isEmpty()
    ? new THREE.Vector3(1, 1, 1)
    : bounds.getSize(new THREE.Vector3());
  return {
    meshCount,
    visibleMeshCount,
    dimensions: [size.x, size.y, size.z],
  };
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
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
