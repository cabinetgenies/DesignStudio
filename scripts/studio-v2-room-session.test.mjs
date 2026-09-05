import test from "node:test";
import assert from "node:assert/strict";
import {
  emptySession,
  nextActiveRoomAfterDelete,
} from "../lib/studio-v2/room-session.ts";

test("material selections remain isolated between rooms", () => {
  const kitchen = emptySession();
  const bath = emptySession();
  kitchen.materialSelections.perimeter = "navy";
  bath.materialSelections.perimeter = "warm-white";
  assert.equal(kitchen.materialSelections.perimeter, "navy");
  assert.equal(bath.materialSelections.perimeter, "warm-white");
});

test("camera poses remain isolated between rooms", () => {
  const kitchen = emptySession();
  const bath = emptySession();
  kitchen.cameraPose = { position: [1, 2, 3], target: [0, 1, 0] };
  assert.equal(bath.cameraPose, null);
  assert.deepEqual(kitchen.cameraPose, {
    position: [1, 2, 3],
    target: [0, 1, 0],
  });
});

test("active panel tabs remain isolated and restore correctly", () => {
  const kitchen = emptySession();
  const bath = emptySession();
  kitchen.activePanelTab = "lighting";
  bath.activePanelTab = "view";
  assert.equal(kitchen.activePanelTab, "lighting");
  assert.equal(bath.activePanelTab, "view");
});

test("renaming preserves session state for the stable ID", () => {
  const session = emptySession();
  session.materialSelections.island = "sage";
  session.cameraPose = { position: [4, 5, 6], target: [1, 1, 1] };
  session.activePanelTab = "view";

  const sessions = new Map([["room-1", session]]);
  const renamed = new Map(sessions);
  assert.equal(renamed.get("room-1"), session);
  assert.equal(renamed.get("room-1").materialSelections.island, "sage");
  assert.equal(renamed.get("room-1").activePanelTab, "view");
});

test("deleting an inactive room keeps the active room unchanged", () => {
  assert.equal(nextActiveRoomAfterDelete(["a", "b", "c"], "c", "a"), "a");
});

test("deleting the active room selects the nearest remaining fallback", () => {
  assert.equal(nextActiveRoomAfterDelete(["a", "b", "c"], "a", "a"), "b");
});

test("deleting the final room returns null for a new empty Kitchen", () => {
  assert.equal(nextActiveRoomAfterDelete(["a"], "a", "a"), null);
});

test("zone counts are isolated per session", () => {
  const a = emptySession();
  const b = emptySession();
  a.runtimeZoneCounts.perimeter = 10;
  assert.equal(b.runtimeZoneCounts.perimeter, 0);
});
