import test from "node:test";
import assert from "node:assert/strict";
import { classifyRuntimeMeshes } from "../lib/studio-v2/runtime-classify.ts";

function mesh(id, overrides = {}) {
  return {
    id,
    name: "",
    parentName: "",
    dimensions: [1, 1, 1],
    center: [0, 1, 0],
    heightAboveFloor: 0.5,
    volume: 1,
    color: null,
    metalness: 0,
    transparent: false,
    ...overrides,
  };
}

test("detects floor, countertop, wall, and hardware", () => {
  const result = classifyRuntimeMeshes([
    mesh("floor", {
      name: "Floor",
      dimensions: [4, 0.05, 3],
      center: [0, 0.025, 0],
      heightAboveFloor: 0,
      volume: 0.6,
    }),
    mesh("counter", {
      name: "Counter",
      dimensions: [1.5, 0.06, 0.7],
      center: [0, 0.9, 0],
      heightAboveFloor: 0.87,
      volume: 0.063,
    }),
    mesh("wall", {
      name: "Wall",
      dimensions: [3, 2.4, 0.12],
      center: [0, 1.2, 0],
      heightAboveFloor: 0,
      volume: 0.864,
    }),
    mesh("pull", {
      name: "Pull",
      dimensions: [0.05, 0.05, 0.02],
      center: [0, 0.9, 0],
      heightAboveFloor: 0.85,
      volume: 0.00005,
      metalness: 1,
    }),
  ]);
  const byMesh = new Map(result.targets.map((t) => [t.meshId, t.role]));
  assert.equal(byMesh.get("floor"), "floor");
  assert.equal(byMesh.get("counter"), "countertop");
  assert.equal(byMesh.get("wall"), "wall");
  assert.equal(byMesh.get("pull"), "hardware");
});

test("cabinet names remain separate instances and classify perimeter or island", () => {
  const result = classifyRuntimeMeshes([
    mesh("cab1", { name: "DB30-3", parentName: "A", center: [0, 0.5, 2] }),
    mesh("cab2", { name: "DB30-3", parentName: "B", center: [0, 0.5, -2] }),
    mesh("island", { name: "DB30-3", parentName: "C", center: [0, 0.5, 0] }),
  ]);
  const ids = result.targets.filter((t) => t.role === "cabinet-finish").map((t) => t.meshId);
  assert.equal(ids.length, 3);
  assert.deepEqual(new Set(ids), new Set(["cab1", "cab2", "island"]));
});
