import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveScenarioRoute,
  updateScenarioSearch,
} from "../public/demos/manzai-training/scenario-routing.js";

const catalog = {
  categories: [{ id: "manzai" }, { id: "service" }],
  scenarios: [
    { id: "jokes", categoryId: "manzai" },
    { id: "hotel", categoryId: "service" },
  ],
};

test("scenario route selects the scenario and its category", () => {
  assert.deepEqual(resolveScenarioRoute(catalog, "?scenario=hotel"), {
    categoryId: "service",
    scenarioId: "hotel",
    usedFallback: false,
  });
});

test("invalid route falls back to the first scenario", () => {
  assert.deepEqual(resolveScenarioRoute(catalog, "?scenario=missing"), {
    categoryId: "manzai",
    scenarioId: "jokes",
    usedFallback: true,
  });
});

test("scenario search preserves unrelated parameters", () => {
  assert.equal(
    updateScenarioSearch("?lang=ja", "service", "hotel"),
    "?lang=ja&category=service&scenario=hotel",
  );
});
