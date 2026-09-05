import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { applyColladaPatches } from "@/lib/studio/collada-patches";

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
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  loadDae(xml: string): V2LoadResult {
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
    this.frame(wrapper);

    const counts = countMeshes(wrapper);
    return counts;
  }

  clearModel() {
    this.clearModelOnly();
    this.resetView();
  }

  private clearModelOnly() {
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObject(this.modelRoot);
      this.modelRoot = null;
    }
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

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    this.clearModelOnly();
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
