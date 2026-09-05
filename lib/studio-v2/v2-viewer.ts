import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { applyColladaPatches } from "@/lib/studio/collada-patches";
import type { V2Assembly } from "./dae-classify";
import {
  classifyRuntimeMeshes,
  type V2ClassificationSummary,
  type RuntimeMeshEvidence,
} from "./runtime-classify";
import {
  getV2Material,
  type V2Material,
  type V2MaterialZone,
} from "./materials";

export type V2View =
  | "reset"
  | "fit"
  | "front"
  | "left"
  | "right"
  | "top"
  | "inside";

export interface V2CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export interface V2LoadResult {
  meshCount: number;
  visibleMeshCount: number;
  dimensions: [number, number, number];
  classification?: V2ClassificationSummary;
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
  private classificationSummary: V2ClassificationSummary | null = null;

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
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 80;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.target.set(0, 1, 0);
    this.setInteractionMode("orbit");

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
    void assemblies;
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
    this.classifyScene(wrapper);
    this.frame(wrapper);

    const counts = countMeshes(wrapper);
    return { ...counts, classification: this.classificationSummary ?? undefined };
  }

  private classifyScene(root: THREE.Object3D) {
    this.originalMaterials.clear();
    this.overrideClones.clear();
    this.zoneMeshes.clear();

    const evidence: RuntimeMeshEvidence[] = [];
    const meshById = new Map<string, THREE.Mesh>();

    root.updateMatrixWorld(true);
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
      meshById.set(key, mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.isEmpty()
        ? new THREE.Vector3(0.1, 0.1, 0.1)
        : box.getSize(new THREE.Vector3());
      const center = box.isEmpty()
        ? new THREE.Vector3(0, 0.1, 0)
        : box.getCenter(new THREE.Vector3());
      const material = Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material;
      const standard = material as THREE.MeshStandardMaterial | null;
      const color = standard?.color
        ? `#${standard.color.getHexString()}`
        : null;
      evidence.push({
        id: key,
        name: mesh.name || mesh.parent?.name || mesh.type,
        parentName: mesh.parent?.name || "",
        dimensions: [size.x, size.y, size.z],
        center: [center.x, center.y, center.z],
        heightAboveFloor: Math.max(center.y - size.y / 2, 0),
        volume: size.x * size.y * size.z,
        color,
        metalness: standard?.metalness ?? 0,
        transparent: Boolean(material?.transparent),
      });
    });

    this.classificationSummary = classifyRuntimeMeshes(evidence);
    for (const target of this.classificationSummary.targets) {
      const mesh = meshById.get(target.meshId);
      if (!mesh || !target.zone) {
        continue;
      }
      const list = this.zoneMeshes.get(target.zone) ?? [];
      list.push(mesh);
      this.zoneMeshes.set(target.zone, list);
    }
  }

  getClassificationSummary(): V2ClassificationSummary | null {
    return this.classificationSummary;
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
    this.applyViewPose("reset", wrapper);
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

  fitKitchen() {
    if (this.modelRoot) {
      this.applyViewPose("fit", this.modelRoot);
    }
  }

  setView(view: V2View) {
    if (view === "reset") {
      this.resetView();
      return;
    }
    if (view === "fit") {
      this.fitKitchen();
      return;
    }
    if (!this.modelRoot) {
      return;
    }
    this.applyViewPose(view, this.modelRoot);
  }

  setInteractionMode(mode: "orbit" | "move") {
    if (mode === "move") {
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      this.container.style.cursor = "grab";
    } else {
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      this.container.style.cursor = "default";
    }
  }

  private applyViewPose(view: V2View, wrapper: THREE.Group) {
    const bounds = new THREE.Box3().setFromObject(wrapper);
    if (bounds.isEmpty()) {
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const floorY = bounds.min.y;
    const usefulHeight = Math.min(bounds.max.y, floorY + 2.8) - floorY;
    const fitRadius = Math.max(size.x, size.z, usefulHeight) * 0.5 * 1.15;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const distance = Math.max(
      fitRadius / Math.tan(vFov / 2),
      fitRadius / Math.tan(hFov / 2),
    );
    const eyeY = floorY + 1.6;
    const targetY = floorY + 1.25;
    const target = new THREE.Vector3(center.x, targetY, center.z);

    let position: THREE.Vector3;
    if (view === "top") {
      position = new THREE.Vector3(
        center.x,
        center.y + fitRadius * 2.4,
        center.z + 0.01,
      );
    } else {
      let dirX = 1;
      let dirZ = 1;
      if (view === "front") {
        dirX = 0;
        dirZ = 1;
      } else if (view === "left") {
        dirX = -1;
        dirZ = 0;
      } else if (view === "right") {
        dirX = 1;
        dirZ = 0;
      } else if (view === "inside") {
        dirX = 0;
        dirZ = 1;
      } else if (view === "fit") {
        dirX = this.camera.position.x - target.x;
        dirZ = this.camera.position.z - target.z;
        const len = Math.hypot(dirX, dirZ) || 1;
        dirX /= len;
        dirZ /= len;
      }
      const dir = new THREE.Vector3(dirX, 0, dirZ).normalize();
      position = target.clone().addScaledVector(dir, distance);
      position.y = eyeY;
      if (view === "inside") {
        position = target
          .clone()
          .addScaledVector(dir, Math.max(distance * 0.55, 0.8));
        position.y = eyeY;
      }
    }

    this.camera.position.copy(position);
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
