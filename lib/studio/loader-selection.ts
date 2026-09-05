export type LoaderSelection = "collada" | "gltf" | "unsupported";

export function selectLoader(
  format: string | null | undefined,
): LoaderSelection {
  if (format === "dae") {
    return "collada";
  }
  if (format === "glb") {
    return "gltf";
  }
  return "unsupported";
}
