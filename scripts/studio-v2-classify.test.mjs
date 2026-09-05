import test from "node:test";
import assert from "node:assert/strict";
import { classifyDaeAssemblies } from "../lib/studio-v2/dae-classify.ts";

test("classifies cabinet, island, tall, countertop, and wall nodes", () => {
  const xml = `<COLLADA><library_visual_scenes><visual_scene id="S">
    <node id="a" name="DB30-3"/>
    <node id="b" name="ISLAND"/>
    <node id="c" name="UC182593"/>
    <node id="d" name="COUNTER"/>
    <node id="e" name="Wall Group"/>
  </visual_scene></library_visual_scenes></COLLADA>`;
  const assemblies = classifyDaeAssemblies(xml);
  const zones = assemblies.map((a) => a.proposedZone);
  assert.ok(zones.includes("perimeter"));
  assert.ok(zones.includes("island"));
  assert.ok(zones.includes("tall"));
  assert.ok(zones.includes("countertops"));
  assert.ok(zones.includes("walls"));
});
