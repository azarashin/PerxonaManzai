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
    ["$schema", "id", "title", "description", "startBeatId", "stateVariables", "evaluationAxes", "beats"],
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
  const beatIds = new Set(scenario.beats.map((beat) => beat.id));
  if (scenario.startBeatId !== undefined) {
    assertId(scenario.startBeatId, `${filename} start beat`);
    assert.ok(beatIds.has(scenario.startBeatId), `${filename}: startBeatId must reference a beat`);
  }
  const stateVariables = new Map();
  for (const variable of scenario.stateVariables ?? []) {
    assertOnlyKeys(variable, ["id", "label", "description", "type", "initialValue", "minimum", "maximum"], `${filename} state variable`);
    assertId(variable.id, `${filename} state variable`);
    assert.ok(!stateVariables.has(variable.id), `${filename}: state variable IDs must be unique`);
    assertLocalizedText(variable.label, `${filename} ${variable.id} label`);
    assertLocalizedText(variable.description, `${filename} ${variable.id} description`);
    assert.ok(["number", "boolean", "string"].includes(variable.type), `${filename}: invalid state type`);
    assertStateValueType(variable.initialValue, variable.type, `${filename} ${variable.id} initialValue`);
    if (variable.type === "number") {
      if (variable.minimum !== undefined) assert.equal(typeof variable.minimum, "number");
      if (variable.maximum !== undefined) assert.equal(typeof variable.maximum, "number");
      if (variable.minimum !== undefined) assert.ok(variable.initialValue >= variable.minimum);
      if (variable.maximum !== undefined) assert.ok(variable.initialValue <= variable.maximum);
      if (variable.minimum !== undefined && variable.maximum !== undefined) assert.ok(variable.minimum <= variable.maximum);
    } else {
      assert.equal(variable.minimum, undefined, `${filename}: only number state can define minimum`);
      assert.equal(variable.maximum, undefined, `${filename}: only number state can define maximum`);
    }
    stateVariables.set(variable.id, variable);
  }
  assertUniqueIds(scenario.evaluationAxes, `${filename} evaluation axis`);
  assert.equal(
    scenario.evaluationAxes.reduce((total, axis) => total + axis.maxPoints, 0),
    80,
    `${filename}: evaluation axis maximums must total 80`,
  );
  const axesById = new Map();
  for (const axis of scenario.evaluationAxes) {
    assertOnlyKeys(axis, ["id", "label", "description", "maxPoints"], `${filename} evaluation axis`);
    assertId(axis.id, `${filename} evaluation axis`);
    assertLocalizedText(axis.label, `${filename} ${axis.id} label`);
    assertLocalizedText(axis.description, `${filename} ${axis.id} description`);
    assert.ok(Number.isInteger(axis.maxPoints) && axis.maxPoints > 0 && axis.maxPoints <= 80);
    axesById.set(axis.id, axis);
  }
  assertUniqueIds(scenario.beats, `${filename} beat`);

  for (const beat of scenario.beats) {
    assertOnlyKeys(beat, ["id", "boke", "pronunciationGuide", "reaction", "choices"], `${filename} beat`);
    assertId(beat.id, `${filename} beat`);
    assertLocalizedText(beat.boke, `${filename} ${beat.id} boke`);
    if (beat.pronunciationGuide !== undefined) {
      assertPronunciationGuide(beat.pronunciationGuide, `${filename} ${beat.id} pronunciation guide`);
    }
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
        ["id", "text", "pronunciationGuide", "aliases", "axisScores", "stateEffects", "routes", "feedback"],
        `${filename} choice ${choice.id}`,
      );
      assertId(choice.id, `${filename} choice`);
      assertLocalizedText(choice.text, `${filename} ${choice.id} text`);
      if (choice.pronunciationGuide !== undefined) {
        assertPronunciationGuide(choice.pronunciationGuide, `${filename} ${choice.id} pronunciation guide`);
      }
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
      assertOnlyKeys(choice.axisScores, [...axesById.keys()], `${filename} ${choice.id} axisScores`);
      assert.deepEqual(
        Object.keys(choice.axisScores).sort(),
        [...axesById.keys()].sort(),
        `${filename}: ${choice.id} must score every evaluation axis`,
      );
      for (const [axisId, score] of Object.entries(choice.axisScores)) {
        assert.ok(
          Number.isInteger(score) && score >= 0 && score <= axesById.get(axisId).maxPoints,
          `${filename}: ${choice.id} ${axisId} score is outside its allowed range`,
        );
      }
      validateStateEffects(choice.stateEffects, stateVariables, `${filename} ${choice.id}`);
      validateRoutes(choice.routes, stateVariables, beatIds, `${filename} ${choice.id}`);
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

function assertPronunciationGuide(value, label) {
  assertLocalizedText(value, label);
  for (const language of ["ja", "en", "zh"]) {
    assert.equal(
      value[language],
      value[language].normalize("NFC"),
      `${label}.${language} must use Unicode NFC normalization`,
    );
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

function assertStateValueType(value, type, label) {
  assert.equal(typeof value, type, `${label} must be a ${type}`);
}

function validateStateEffects(effects = [], variables, label) {
  const affectedIds = new Set();
  for (const effect of effects) {
    assertOnlyKeys(effect, ["stateId", "operation", "value"], `${label} state effect`);
    const variable = variables.get(effect.stateId);
    assert.ok(variable, `${label}: state effect must reference a declared variable`);
    assert.ok(!affectedIds.has(effect.stateId), `${label}: a state variable can only be updated once`);
    assert.ok(["set", "add"].includes(effect.operation), `${label}: invalid state operation`);
    assertStateValueType(effect.value, variable.type, `${label} ${effect.stateId} effect value`);
    assert.ok(effect.operation !== "add" || variable.type === "number", `${label}: add requires number state`);
    affectedIds.add(effect.stateId);
  }
}

function validateRoutes(routes = [], variables, beatIds, label) {
  let fallbackSeen = false;
  for (const [index, route] of routes.entries()) {
    assertOnlyKeys(route, ["conditions", "nextBeatId"], `${label} route`);
    if (route.nextBeatId !== null) {
      assert.ok(beatIds.has(route.nextBeatId), `${label}: route must reference a beat or null`);
    }
    if (route.conditions === undefined) {
      assert.equal(index, routes.length - 1, `${label}: an unconditional route must be last`);
      fallbackSeen = true;
      continue;
    }
    assert.ok(!fallbackSeen && route.conditions.length > 0, `${label}: route conditions must not be empty`);
    for (const condition of route.conditions) {
      assertOnlyKeys(condition, ["stateId", "operator", "value"], `${label} route condition`);
      const variable = variables.get(condition.stateId);
      assert.ok(variable, `${label}: route condition must reference a declared variable`);
      assertStateValueType(condition.value, variable.type, `${label} ${condition.stateId} condition value`);
      const ordered = ["greater-than", "greater-than-or-equal", "less-than", "less-than-or-equal"].includes(condition.operator);
      assert.ok(
        ["equals", "not-equals", "greater-than", "greater-than-or-equal", "less-than", "less-than-or-equal"].includes(condition.operator),
        `${label}: invalid route operator`,
      );
      assert.ok(!ordered || variable.type === "number", `${label}: ordered comparisons require number state`);
    }
  }
  if (routes.length > 0) assert.ok(fallbackSeen, `${label}: routes require a final unconditional fallback`);
}

function assertOnlyKeys(value, allowedKeys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  assert.deepEqual(unknownKeys, [], `${label} has unknown properties`);
}
