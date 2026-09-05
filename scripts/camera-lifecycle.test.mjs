import test from "node:test";
import assert from "node:assert/strict";
import {
  makeSimpleCameraPose,
  shouldApplyOneShotCommand,
} from "../lib/studio/simple-camera.ts";

const bounds = {
  center: [0, 1, 0],
  size: [2, 2, 2],
  min: [-1, 0, -1],
  max: [1, 2, 1],
};

test("one-shot command is applied exactly once", () => {
  assert.equal(shouldApplyOneShotCommand(null, 1), true);
  assert.equal(shouldApplyOneShotCommand(1, 1), false);
  assert.equal(shouldApplyOneShotCommand(1, 2), true);
});

test("camera poses target the imported bounds and differ per view", () => {
  const reset = makeSimpleCameraPose(bounds, "reset");
  const front = makeSimpleCameraPose(bounds, "front");
  const inside = makeSimpleCameraPose(bounds, "inside");

  assert.deepEqual(reset.target, front.target);
  assert.notDeepEqual(reset.position, front.position);
  assert.notDeepEqual(front.position, inside.position);
  assert.deepEqual(inside.target, reset.target);
});
