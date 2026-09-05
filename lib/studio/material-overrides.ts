import * as THREE from "three";
import type {
  MaterialAssignments,
  MaterialZoneId,
  ZoneMaterialSelections,
} from "./material-zones";
import { demoMeshZones, zoneById } from "./material-zones";
import { getMaterial, type StudioMaterial } from "./materials";

export const SELECTION_COLOR = "#3b82f6";
export const SELECTION_INTENSITY = 0.5;
export const ZONE_VIZ_INTENSITY = 0.38;

export interface OverrideEntry {
  mesh: THREE.Mesh;
  isArray: boolean;
  originals: THREE.Material[];
  clones: THREE.Material[];
  signature: string;
}

export interface Appearance {
  needsOverride: boolean;
  signature: string;
  material: StudioMaterial | null;
  emissive: string | null;
  emissiveIntensity: number;
}

export interface ReconcileInput {
  root: THREE.Object3D | null;
  hasModel: boolean;
  assignments: MaterialAssignments;
  zoneSelections: ZoneMaterialSelections;
  materialsApplied: boolean;
  showZones: boolean;
  selectedKeys: string[];
}

export function meshKey(mesh: THREE.Mesh, hasModel: boolean): string {
  return hasModel ? mesh.uuid : mesh.name || mesh.uuid;
}

export function zoneForMesh(
  mesh: THREE.Mesh,
  hasModel: boolean,
  assignments: MaterialAssignments,
): MaterialZoneId | null {
  if (hasModel) {
    return assignments[mesh.uuid] ?? null;
  }
  return assignments[mesh.name] ?? demoMeshZones[mesh.name] ?? null;
}

export function resolveAppearance(opts: {
  zone: MaterialZoneId | null;
  selected: boolean;
  showZones: boolean;
  materialsApplied: boolean;
  material: StudioMaterial | null;
}): Appearance {
  const { zone, selected, showZones, materialsApplied, material } = opts;
  const applyMaterial = materialsApplied && zone !== null && material !== null;

  let emissive: string | null = null;
  let emissiveIntensity = 0;
  if (selected) {
    emissive = SELECTION_COLOR;
    emissiveIntensity = SELECTION_INTENSITY;
  } else if (showZones && zone) {
    emissive = zoneById[zone].color;
    emissiveIntensity = ZONE_VIZ_INTENSITY;
  }

  const needsOverride = applyMaterial || emissive !== null;
  const signature = `${applyMaterial ? material.id : "orig"}|${
    emissive ?? "none"
  }`;

  return {
    needsOverride,
    signature,
    material: applyMaterial ? material : null,
    emissive,
    emissiveIntensity,
  };
}

function materialListOf(mesh: THREE.Mesh): {
  isArray: boolean;
  materials: THREE.Material[];
} {
  const raw = mesh.material;
  if (Array.isArray(raw)) {
    return {
      isArray: true,
      materials: raw.filter((m): m is THREE.Material => Boolean(m)),
    };
  }
  return { isArray: false, materials: raw ? [raw] : [] };
}

function isStandardLike(
  material: THREE.Material,
): material is THREE.MeshStandardMaterial {
  return "color" in material && "roughness" in material;
}

function applyAppearance(
  material: THREE.Material,
  appearance: Appearance,
): void {
  if (appearance.material) {
    if (isStandardLike(material)) {
      material.color.set(appearance.material.color);
      material.roughness = appearance.material.roughness;
      material.metalness = appearance.material.metalness;
    } else if ("color" in material) {
      (material as THREE.MeshBasicMaterial).color.set(
        appearance.material.color,
      );
    }
  }

  if (appearance.emissive && "emissive" in material) {
    const standard = material as THREE.MeshStandardMaterial;
    standard.emissive.set(appearance.emissive);
    standard.emissiveIntensity = appearance.emissiveIntensity;
  }
}

function disposeClones(entry: OverrideEntry): void {
  for (const clone of entry.clones) {
    clone.dispose();
  }
}

function restoreOriginals(entry: OverrideEntry): void {
  entry.mesh.material = entry.isArray
    ? entry.originals
    : entry.originals[0];
}

export function reconcileOverrides(
  entries: Map<string, OverrideEntry>,
  input: ReconcileInput,
): void {
  const meshes: THREE.Mesh[] = [];
  if (input.root) {
    input.root.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        meshes.push(object as THREE.Mesh);
      }
    });
  }

  const seen = new Set<string>();

  for (const mesh of meshes) {
    const key = meshKey(mesh, input.hasModel);
    seen.add(key);

    const zone = zoneForMesh(mesh, input.hasModel, input.assignments);
    const material = zone
      ? getMaterial(zone, input.zoneSelections[zone] ?? null)
      : null;
    const appearance = resolveAppearance({
      zone,
      selected: input.selectedKeys.includes(key),
      showZones: input.showZones,
      materialsApplied: input.materialsApplied,
      material,
    });

    const existing = entries.get(key);
    if (
      existing &&
      existing.mesh === mesh &&
      existing.signature === appearance.signature
    ) {
      continue;
    }

    if (existing) {
      restoreOriginals(existing);
      disposeClones(existing);
      entries.delete(key);
    }

    if (!appearance.needsOverride) {
      continue;
    }

    const { isArray, materials: originals } = materialListOf(mesh);
    if (originals.length === 0) {
      continue;
    }

    const clones = originals.map((original) => {
      const clone = original.clone();
      applyAppearance(clone, appearance);
      return clone;
    });

    mesh.material = isArray ? clones : clones[0];
    entries.set(key, {
      mesh,
      isArray,
      originals,
      clones,
      signature: appearance.signature,
    });
  }

  for (const [key, entry] of entries) {
    if (!seen.has(key)) {
      restoreOriginals(entry);
      disposeClones(entry);
      entries.delete(key);
    }
  }
}
