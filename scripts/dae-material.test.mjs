import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "@xmldom/xmldom";

globalThis.DOMParser = DOMParser;
globalThis.Image = class {
  constructor() {
    this.width = 1;
    this.height = 1;
    this.onload = null;
    this.onerror = null;
    this._listeners = {};
  }
  addEventListener(type, handler) {
    (this._listeners[type] ||= []).push(handler);
  }
  removeEventListener(type, handler) {
    this._listeners[type] = (this._listeners[type] || []).filter(
      (fn) => fn !== handler,
    );
  }
  set src(value) {
    setTimeout(() => {
      const error = new Error(`missing image: ${value}`);
      if (this.onerror) this.onerror(error);
      for (const handler of this._listeners.error || []) handler(error);
    }, 0);
  }
};
globalThis.document = {
  createElementNS: () => new globalThis.Image(),
};

const { ColladaLoader } = await import(
  "three/examples/jsm/loaders/ColladaLoader.js"
);
const { applyColladaPatches } = await import(
  "../lib/studio/collada-patches.ts"
);
const { extractMissingTextureFiles, parseDaeUnit } = await import(
  "../lib/studio/dae.ts"
);
const { auditDaeSource } = await import("../lib/studio/dae.ts");
applyColladaPatches();

const synthetic = `<?xml version="1.0"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset><unit name="inch" meter="0.0254"/><up_axis>Z_UP</up_axis></asset>
  <library_images>
    <image id="tex"><init_from>missing.jpg</init_from></image>
  </library_images>
  <library_effects>
    <effect id="colorfx"><profile_COMMON><technique sid="common"><lambert><diffuse><color>1 0.5 0.2 1</color></diffuse></lambert></technique></profile_COMMON></effect>
    <effect id="texfx"><profile_COMMON><technique sid="common"><lambert><diffuse><texture texture="tex"/></diffuse></lambert></technique></profile_COMMON></effect>
  </library_effects>
  <library_materials>
    <material id="colorMat"><instance_effect url="#colorfx"/></material>
    <material id="texMat"><instance_effect url="#texfx"/></material>
  </library_materials>
  <library_lights><light id="badLight"/></library_lights>
  <library_geometries>
    <geometry id="geo1"><mesh><source id="pos"><float_array id="posarr" count="9">0 0 0 1 0 0 0 1 0</float_array><technique_common><accessor source="#posarr" count="3" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source><vertices id="verts"><input semantic="POSITION" source="#pos"/></vertices><triangles material="colorMat" count="1"><input semantic="VERTEX" source="#verts" offset="0"/><p>0 1 2</p></triangles></mesh></geometry>
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="Scene"><node id="n1" name="cabinet"><instance_geometry url="#geo1"><bind_material><technique_common><instance_material symbol="colorMat" target="#colorMat"/></technique_common></bind_material></instance_geometry></node></visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>`;

test("DAE helpers extract unit and missing texture filenames", () => {
  assert.deepEqual(parseDaeUnit(synthetic), {
    unit: "inch",
    metersPerUnit: 0.0254,
    upAxis: "Z_UP",
  });
  assert.deepEqual(extractMissingTextureFiles(synthetic), ["missing.jpg"]);
});

test("DAE source audit counts geometry instances and duplicate node IDs", () => {
  const duplicated = `${synthetic}\n<library_nodes><node id="n1"/><node id="n1"/></library_nodes>`;
  const audit = auditDaeSource(duplicated);
  assert.ok(audit.sourceGeometryCount >= 1);
  assert.ok(audit.duplicateIdCount >= 1);
});

test("ColladaLoader tolerates parameter-less lights and missing textures", () => {
  const loader = new ColladaLoader();
  const result = loader.parse(synthetic, "");
  assert.ok(result);
  assert.ok(result.scene);
  assert.ok(result.scene.children.length >= 1);
});
