import test from "node:test";
import assert from "node:assert/strict";
import { emptySession } from "../lib/studio-v2/room-session.ts";

test("room sessions start independent", () => {
  const kitchen = emptySession();
  const bath = emptySession();
  kitchen.materialSelections.perimeter = "navy";
  kitchen.cameraPose = { position: [1, 2, 3], target: [0, 0, 0] };
  kitchen.activePanelTab = "lighting";

  assert.deepEqual(bath.materialSelections, {});
  assert.equal(bath.cameraPose, null);
  assert.equal(bath.activePanelTab, "materials");
});

test("zone counts are isolated per session", () => {
  const a = emptySession();
  const b = emptySession();
  a.runtimeZoneCounts.perimeter = 10;
  assert.equal(b.runtimeZoneCounts.perimeter, 0);
});
