import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { validateScenarioCatalog } from "../public/demos/manzai-training/scenario-catalog.js";
import { ScenarioController } from "../public/demos/manzai-training/scenario-controller.js";

const demoDirectory = new URL(
  "../public/demos/manzai-training/",
  import.meta.url,
);
const scenariosDirectory = new URL("scenarios/", demoDirectory);
const schemasDirectory = new URL("schemas/", demoDirectory);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const [scenarioSchema, catalogSchema, catalogData] = await Promise.all([
  readJson(new URL("scenario.schema.json", schemasDirectory)),
  readJson(new URL("scenario-catalog.schema.json", schemasDirectory)),
  readJson(new URL("index.json", scenariosDirectory)),
]);

assert.equal(scenarioSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(catalogSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
const catalog = validateScenarioCatalog(catalogData);
assertOnlyKeys(catalog, ["$schema", "categories", "scenarios"], "catalog");

for (const category of catalog.categories) {
  assertOnlyKeys(category, ["id", "title", "branching"], `category ${category.id}`);
  assertId(category.id, "category");
  assertLocalizedText(category.title, `category ${category.id} title`);
  assertOnlyKeys(
    category.branching,
    ["requirement", "rationale"],
    `category ${category.id} branching`,
  );
  assert.ok(
    ["not-required", "recommended", "required"].includes(
      category.branching.requirement,
    ),
    `category ${category.id} branching requirement is invalid`,
  );
  assertLocalizedText(
    category.branching.rationale,
    `category ${category.id} branching rationale`,
  );
}

for (const entry of catalog.scenarios) {
  assertOnlyKeys(
    entry,
    ["id", "categoryId", "beatCount", "difficulty", "estimatedMinutes", "learningObjectives", "title", "path"],
    `catalog scenario ${entry.id}`,
  );
  assertId(entry.id, "scenario");
  assertId(entry.categoryId, `${entry.id} category`);
  assert.ok(
    Number.isSafeInteger(entry.beatCount) && entry.beatCount > 0,
    `${entry.id} beatCount must be a positive integer`,
  );
  assert.ok(
    ["beginner", "intermediate", "advanced"].includes(entry.difficulty),
    `${entry.id} difficulty is invalid`,
  );
  assert.ok(
    Number.isSafeInteger(entry.estimatedMinutes) && entry.estimatedMinutes > 0,
    `${entry.id} estimatedMinutes must be a positive integer`,
  );
  assertLocalizedStringLists(
    entry.learningObjectives,
    `${entry.id} learningObjectives`,
  );
  assertLocalizedText(entry.title, `${entry.id} catalog title`);
  assert.match(entry.path, /^\.\/scenarios\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/);

  const filename = entry.path.replace("./scenarios/", "");
  const scenario = await readJson(new URL(filename, scenariosDirectory));
  new ScenarioController(scenario);
  assertOnlyKeys(
    scenario,
    ["$schema", "id", "title", "description", "beats"],
    filename,
  );
  assert.equal(scenario.id, entry.id, `${filename}: catalog ID must match scenario ID`);
  assert.equal(
    scenario.beats.length,
    entry.beatCount,
    `${filename}: catalog beatCount must match beats.length`,
  );
  assert.deepEqual(
    scenario.title,
    entry.title,
    `${filename}: catalog title must match scenario title`,
  );
  assertId(scenario.id, `${filename} scenario`);
  assertLocalizedText(scenario.title, `${filename} title`);
  assertLocalizedText(scenario.description, `${filename} description`);
  assertUniqueIds(scenario.beats, `${filename} beat`);

  for (const beat of scenario.beats) {
    assertOnlyKeys(beat, ["id", "boke", "reaction", "choices"], `${filename} beat`);
    assertId(beat.id, `${filename} beat`);
    assertLocalizedText(beat.boke, `${filename} ${beat.id} boke`);
    assertOnlyKeys(
      beat.reaction,
      ["description", "motionTags", "motionId", "variant", "priority", "cue"],
      `${filename} ${beat.id} reaction`,
    );
    assertLocalizedText(
      beat.reaction.description,
      `${filename} ${beat.id} reaction description`,
    );
    assertUniqueIds(beat.choices, `${filename} choice`);
    assert.equal(new Set(beat.reaction.motionTags).size, beat.reaction.motionTags.length);
    for (const choice of beat.choices) {
      assertOnlyKeys(
        choice,
        ["id", "text", "aliases", "contentPoints", "feedback"],
        `${filename} choice ${choice.id}`,
      );
      assertId(choice.id, `${filename} choice`);
      assertLocalizedText(choice.text, `${filename} ${choice.id} text`);
      assertLocalizedText(choice.feedback, `${filename} ${choice.id} feedback`);
      if (choice.aliases !== undefined) {
        if (Array.isArray(choice.aliases)) {
          assertStringList(choice.aliases, `${filename} ${choice.id} aliases`);
        } else {
          assertOnlyKeys(
            choice.aliases,
            ["ja", "en", "zh"],
            `${filename} ${choice.id} aliases`,
          );
          for (const language of ["ja", "en", "zh"]) {
            assertStringList(
              choice.aliases[language],
              `${filename} ${choice.id} ${language} aliases`,
            );
          }
        }
      }
      assert.ok(
        Number.isInteger(choice.contentPoints) &&
          choice.contentPoints >= 0 &&
          choice.contentPoints <= 80,
        `${filename}: ${choice.id} contentPoints must be an integer from 0 to 80`,
      );
    }
  }
}

console.log(
  `Validated ${catalog.categories.length} categories and ${catalog.scenarios.length} scenarios.`,
);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function assertId(id, label) {
  assert.match(id, idPattern, `${label} ID must use lowercase kebab-case`);
}

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
}

function assertLocalizedText(value, label) {
  assertOnlyKeys(value, ["ja", "en", "zh"], label);
  for (const language of ["ja", "en", "zh"]) {
    assert.equal(typeof value[language], "string", `${label}.${language} must be a string`);
    assert.ok(value[language].trim(), `${label}.${language} must not be empty`);
  }
}

function assertStringList(value, label) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label} must not be empty`);
  assert.equal(new Set(value).size, value.length, `${label} must be unique`);
  for (const item of value) {
    assert.equal(typeof item, "string", `${label} items must be strings`);
    assert.ok(item.trim(), `${label} items must not be empty`);
  }
}

function assertLocalizedStringLists(value, label) {
  assertOnlyKeys(value, ["ja", "en", "zh"], label);
  for (const language of ["ja", "en", "zh"]) {
    assertStringList(value[language], `${label}.${language}`);
  }
}

function assertOnlyKeys(value, allowedKeys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  assert.deepEqual(unknownKeys, [], `${label} has unknown properties`);
}
