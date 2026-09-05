import test from "node:test";
import assert from "node:assert/strict";
import { preprocessDae } from "../lib/studio-v2/dae-preprocess.ts";

test("repairs duplicate node IDs deterministically", () => {
  const xml = `<COLLADA><library_visual_scenes><visual_scene id="S"><node id="cab"/><node id="cab"/></visual_scene></library_visual_scenes></COLLADA>`;
  const result = preprocessDae(xml);
  assert.equal(result.duplicateIdCount, 1);
  assert.equal(result.repairedIds, 1);
  assert.match(result.xml, /id="cab"/);
  assert.match(result.xml, /id="cab__occ2"/);
});

test("counts geometry instances and missing textures", () => {
  const xml = `<COLLADA>
    <library_images><image id="t"><init_from>wood.jpg</init_from></image></library_images>
    <library_geometries><geometry id="g"/></library_geometries>
    <library_visual_scenes><visual_scene id="S"><node id="n"><instance_geometry url="#g"/></node></visual_scene></library_visual_scenes>
  </COLLADA>`;
  const result = preprocessDae(xml);
  assert.equal(result.sourceGeometryCount, 1);
  assert.equal(result.sourceInstanceCount, 1);
  assert.equal(result.sourceNodeCount, 1);
  assert.deepEqual(result.missingTextures, ["wood.jpg"]);
});
