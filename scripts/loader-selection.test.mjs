import test from "node:test";
import assert from "node:assert/strict";
import { selectLoader } from "../lib/studio/loader-selection.ts";

test("XML DAE format maps to ColladaLoader", () => {
  assert.equal(selectLoader("dae"), "collada");
});

test("extension-less Blob URLs still use the explicit DAE format", () => {
  assert.equal(selectLoader("dae"), "collada");
});

test("GLB maps to GLTFLoader", () => {
  assert.equal(selectLoader("glb"), "gltf");
});

test("missing format is unsupported rather than defaulting to GLTF", () => {
  assert.equal(selectLoader(null), "unsupported");
  assert.equal(selectLoader(undefined), "unsupported");
});

test("unknown format is unsupported", () => {
  assert.equal(selectLoader("pdf"), "unsupported");
});

test("DAE is never routed through the JSON parser path", () => {
  const xml = '<?xml version="1.0"?><COLLADA/>';
  assert.throws(() => JSON.parse(xml), SyntaxError);
  assert.equal(selectLoader("dae"), "collada");
});
