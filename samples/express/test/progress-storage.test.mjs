import assert from "node:assert/strict";
import test from "node:test";

import {
  clearProgress,
  filterScenariosByCompletion,
  isProgressStorageEnabled,
  loadProgress,
  recordScenarioCompletion,
  setProgressStorageEnabled,
} from "../public/demos/manzai-training/progress-storage.js";

test("progress storage is opt-in and counts completions by scenario", () => {
  const storage = new MemoryStorage();

  assert.equal(isProgressStorageEnabled(storage), false);
  recordScenarioCompletion("convenience-store", storage);
  assert.deepEqual(loadProgress(storage).scenarios, {});

  assert.equal(setProgressStorageEnabled(true, storage), true);
  recordScenarioCompletion("convenience-store", storage);
  recordScenarioCompletion("convenience-store", storage);
  recordScenarioCompletion("restaurant-service", storage);

  assert.deepEqual(loadProgress(storage).scenarios, {
    "convenience-store": 2,
    "restaurant-service": 1,
  });
});

test("disabling storage retains existing progress but stops new counts", () => {
  const storage = new MemoryStorage();
  setProgressStorageEnabled(true, storage);
  recordScenarioCompletion("convenience-store", storage);

  setProgressStorageEnabled(false, storage);
  recordScenarioCompletion("convenience-store", storage);

  assert.equal(isProgressStorageEnabled(storage), false);
  assert.equal(loadProgress(storage).scenarios["convenience-store"], 1);
});

test("clear removes all saved completion counts", () => {
  const storage = new MemoryStorage();
  setProgressStorageEnabled(true, storage);
  recordScenarioCompletion("restaurant-service", storage);

  assert.equal(clearProgress(storage), true);
  assert.deepEqual(loadProgress(storage).scenarios, {});
  assert.equal(isProgressStorageEnabled(storage), true);
});

test("invalid stored data is ignored", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "perxona-scenario-training-progress-v1",
    JSON.stringify({ version: 1, scenarios: { unsafe: -1 } }),
  );

  assert.deepEqual(loadProgress(storage), { version: 1, scenarios: {} });
});

test("scenarios can be filtered by completion", () => {
  const scenarios = [{ id: "first" }, { id: "second" }];
  const progress = { version: 1, scenarios: { first: 2 } };

  assert.deepEqual(
    filterScenariosByCompletion(scenarios, progress, "completed"),
    [{ id: "first" }],
  );
  assert.deepEqual(
    filterScenariosByCompletion(scenarios, progress, "incomplete"),
    [{ id: "second" }],
  );
});

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}
