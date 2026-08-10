import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  scenariosForCategory,
  validateScenarioCatalog,
} from "../public/demos/manzai-training/scenario-catalog.js";
import { ScenarioController } from "../public/demos/manzai-training/scenario-controller.js";

const scenariosDirectory = new URL(
  "../public/demos/manzai-training/scenarios/",
  import.meta.url,
);

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(new URL(relativePath, scenariosDirectory), "utf8"),
  );
}

test("bundled catalog contains valid categories and loadable scenarios", async () => {
  const catalog = validateScenarioCatalog(await readJson("index.json"));

  assert.equal(catalog.categories.length, 2);
  assert.equal(scenariosForCategory(catalog, "manzai").length, 1);
  assert.equal(scenariosForCategory(catalog, "customer-service").length, 1);

  for (const entry of catalog.scenarios) {
    const filename = entry.path.replace("./scenarios/", "");
    const scenario = await readJson(filename);
    assert.equal(scenario.id, entry.id);
    assert.deepEqual(scenario.title, entry.title);
    assert.doesNotThrow(() => new ScenarioController(scenario));
  }
});

test("catalog rejects duplicate ids", () => {
  assert.throws(
    () =>
      validateScenarioCatalog({
        categories: [category("manzai"), category("manzai")],
        scenarios: [],
      }),
    /Duplicate category id/,
  );
});

test("catalog rejects a scenario with an unknown category", () => {
  assert.throws(
    () =>
      validateScenarioCatalog({
        categories: [category("manzai")],
        scenarios: [scenario("service", "missing")],
      }),
    /unknown category/,
  );
});

test("an empty category returns no scenarios", () => {
  const catalog = validateScenarioCatalog({
    categories: [category("empty")],
    scenarios: [],
  });
  assert.deepEqual(scenariosForCategory(catalog, "empty"), []);
});

function category(id) {
  return { id, title: localized(id) };
}

function scenario(id, categoryId) {
  return {
    id,
    categoryId,
    title: localized(id),
    path: `./scenarios/${id}.json`,
  };
}

function localized(value) {
  return { ja: value, en: value, zh: value };
}
