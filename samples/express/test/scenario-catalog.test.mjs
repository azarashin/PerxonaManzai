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

  const expectedScenarioCounts = {
    manzai: 4,
    "customer-service": 4,
    "partner-communication": 4,
    "negotiation-sales": 4,
    "workplace-communication": 3,
    "apology-response": 3,
    "interview-hiring": 3,
    "teacher-student": 3,
    "friend-advice": 3,
    "scam-awareness": 3,
    "parent-child": 3,
    "investigative-interview": 3,
    "diplomatic-negotiation": 3,
    "clinical-communication": 3,
    "crisis-negotiation": 3,
    "special-fraud-prevention": 3,
  };

  assert.equal(catalog.categories.length, 16);
  assert.equal(catalog.scenarios.length, 52);
  for (const [categoryId, expectedCount] of Object.entries(
    expectedScenarioCounts,
  )) {
    assert.equal(
      scenariosForCategory(catalog, categoryId).length,
      expectedCount,
      categoryId,
    );
  }

  for (const entry of catalog.scenarios) {
    const filename = entry.path.replace("./scenarios/", "");
    const scenario = await readJson(filename);
    assert.equal(scenario.id, entry.id);
    assert.deepEqual(scenario.title, entry.title);
    assert.doesNotThrow(() => new ScenarioController(scenario));
  }
});

test("convenience store pilot provides pronunciation guides for every spoken line", async () => {
  const scenario = await readJson("convenience-store.json");
  const utterances = scenario.beats.flatMap((beat) => [beat, ...beat.choices]);

  for (const utterance of utterances) {
    assert.deepEqual(Object.keys(utterance.pronunciationGuide).sort(), ["en", "ja", "zh"]);
    assert.doesNotMatch(utterance.pronunciationGuide.ja, /[\p{Script=Han}\p{Script=Katakana}]/u);
    assert.match(utterance.pronunciationGuide.en, /^\/.+\/$/u);
    assert.doesNotMatch(utterance.pronunciationGuide.zh, /\p{Script=Han}/u);
    for (const guide of Object.values(utterance.pronunciationGuide)) {
      assert.equal(guide, guide.normalize("NFC"));
    }
  }
});

test("special fraud scenarios prioritize expressive avatar motions", async () => {
  const catalog = validateScenarioCatalog(await readJson("index.json"));
  const entries = scenariosForCategory(catalog, "special-fraud-prevention");

  assert.equal(entries.length, 3);
  for (const entry of entries) {
    const scenario = await readJson(entry.path.replace("./scenarios/", ""));
    for (const beat of scenario.beats) {
      assert.match(
        beat.reaction.motionTags[0],
        /^pose:emotion_/,
        `${scenario.id}/${beat.id}`,
      );
    }
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

test("catalog rejects invalid branching guidance", () => {
  const invalidCategory = category("manzai");
  invalidCategory.branching.requirement = "sometimes";
  assert.throws(
    () => validateScenarioCatalog({ categories: [invalidCategory], scenarios: [] }),
    /branching guidance/,
  );
});

test("an empty category returns no scenarios", () => {
  const catalog = validateScenarioCatalog({
    categories: [category("empty")],
    scenarios: [],
  });
  assert.deepEqual(scenariosForCategory(catalog, "empty"), []);
});

test("scenarios are ordered by beat count within a category", () => {
  const catalog = validateScenarioCatalog({
    categories: [category("manzai")],
    scenarios: [
      scenario("long", "manzai", 5),
      scenario("short", "manzai", 2),
      scenario("medium", "manzai", 3),
    ],
  });

  assert.deepEqual(
    scenariosForCategory(catalog, "manzai").map(({ id }) => id),
    ["short", "medium", "long"],
  );
});

function category(id) {
  return {
    id,
    title: localized(id),
    branching: {
      requirement: "not-required",
      rationale: localized("Linear progression is sufficient."),
    },
  };
}

function scenario(id, categoryId, beatCount = 1) {
  return {
    id,
    categoryId,
    beatCount,
    difficulty: "beginner",
    estimatedMinutes: 3,
    learningObjectives: {
      ja: ["目標"],
      en: ["Objective"],
      zh: ["目標"],
    },
    title: localized(id),
    path: `./scenarios/${id}.json`,
  };
}

function localized(value) {
  return { ja: value, en: value, zh: value };
}
