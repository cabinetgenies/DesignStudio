import test from "node:test";
import assert from "node:assert/strict";
import { RoomModelRegistry } from "../lib/studio-v2/room-model-registry.ts";

function createHarness() {
  const logs = {
    attach: [],
    detach: [],
    dispose: [],
    parse: [],
  };
  const registry = new RoomModelRegistry({
    parse: async (source) => {
      logs.parse.push(source);
      return { id: source };
    },
    attach: (model) => logs.attach.push(model.id),
    detach: (model) => logs.detach.push(model.id),
    dispose: (model) => logs.dispose.push(model.id),
  });
  return { registry, logs };
}

test("first load parses a room exactly once", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  registry.show("a");
  assert.equal(logs.parse.length, 1);
});

test("repeated showRoom does not reparse", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  registry.show("a");
  registry.show("a");
  assert.equal(logs.parse.length, 1);
});

test("switch A to B to A attaches cached A", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  await registry.load("b", "B");
  registry.show("a");
  registry.show("b");
  registry.show("a");
  assert.equal(logs.parse.length, 2);
  assert.ok(logs.attach.filter((id) => id === "A").length >= 2);
});

test("empty room detaches visible model without disposing it", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  registry.show("a");
  registry.show("empty");
  assert.equal(logs.detach.includes("A"), true);
  assert.equal(logs.dispose.includes("A"), false);
});

test("replace disposes old root exactly once", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  await registry.load("a", "A2");
  assert.equal(logs.dispose.filter((id) => id === "A").length, 1);
});

test("failed replacement preserves existing root", async () => {
  const logs = { parse: [], dispose: [], attach: [], detach: [] };
  const registry = new RoomModelRegistry({
    parse: async (source) => {
      logs.parse.push(source);
      if (source === "FAIL") throw new Error("fail");
      return { id: source };
    },
    attach: (m) => logs.attach.push(m.id),
    detach: (m) => logs.detach.push(m.id),
    dispose: (m) => logs.dispose.push(m.id),
  });
  await registry.load("a", "A");
  await assert.rejects(() => registry.load("a", "FAIL"));
  assert.equal(registry.diagnostics().cachedRoomIds.includes("a"), true);
  assert.equal(logs.dispose.includes("A"), false);
});

test("remove disposes only the targeted room", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  await registry.load("b", "B");
  registry.remove("a");
  assert.equal(logs.dispose.includes("A"), true);
  assert.equal(logs.dispose.includes("B"), false);
});

test("removing inactive room does not detach active room", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  await registry.load("b", "B");
  registry.show("a");
  registry.remove("b");
  assert.equal(registry.diagnostics().visibleRoomId, "a");
  assert.equal(logs.detach.includes("A"), false);
});

test("dispose disposes every cached root exactly once", async () => {
  const { registry, logs } = createHarness();
  await registry.load("a", "A");
  await registry.load("b", "B");
  registry.dispose();
  assert.equal(logs.dispose.filter((id) => id === "A").length, 1);
  assert.equal(logs.dispose.filter((id) => id === "B").length, 1);
});

test("duplicate loading cannot create multiple cached roots", async () => {
  const { registry } = createHarness();
  await registry.load("a", "A");
  await registry.load("a", "A2");
  assert.equal(registry.diagnostics().cachedRoomIds.length, 1);
});

test("stale asynchronous parse cannot replace newer room upload", async () => {
  let resolveFirst;
  let resolveSecond;
  const logs = { parse: [], attach: [], detach: [], dispose: [] };
  const registry = new RoomModelRegistry({
    parse: (source) => {
      logs.parse.push(source);
      return new Promise((resolve) => {
        if (source === "SLOW") resolveFirst = resolve;
        else resolveSecond = resolve;
      });
    },
    attach: (m) => logs.attach.push(m.id),
    detach: (m) => logs.detach.push(m.id),
    dispose: (m) => logs.dispose.push(m.id),
  });
  const slow = registry.load("a", "SLOW");
  const fast = registry.load("a", "FAST");
  resolveSecond({ id: "FAST" });
  await fast;
  resolveFirst({ id: "SLOW" });
  await slow;
  assert.equal(registry.diagnostics().parseCountByRoom.a, 1);
  assert.equal(logs.dispose.includes("SLOW"), true);
});
