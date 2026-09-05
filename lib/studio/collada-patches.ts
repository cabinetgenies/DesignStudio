import { AmbientLight } from "three";
import { ColladaComposer } from "three/examples/jsm/loaders/collada/ColladaComposer.js";

let patched = false;

/**
 * ColladaComposer assumes every light has `data.parameters` and a supported
 * `technique`. Some 2020 exports contain lights with neither. Patch the
 * prototype defensively so unsupported lights are skipped instead of crashing
 * the entire import.
 */
export function applyColladaPatches(): void {
  if (patched) {
    return;
  }
  patched = true;

  const originalBuildLight = ColladaComposer.prototype.buildLight;

  ColladaComposer.prototype.buildLight = function buildLightPatched(
    data: unknown,
  ) {
    const lightData = data as {
      technique?: string;
      parameters?: Record<string, unknown>;
      id?: string;
    };
    if (!lightData || !lightData.technique) {
      console.warn(
        "THREE.ColladaLoader: Skipping unsupported or parameter-less light.",
        lightData?.id ?? "",
      );
      return null;
    }

    const safe = {
      ...lightData,
      parameters: lightData.parameters ?? {},
    };
    const light = originalBuildLight.call(this, safe);
    return light ?? new AmbientLight();
  };
}
