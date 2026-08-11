import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  analyzeScenarioCatalogQuality,
  analyzeScenarioQuality,
  normalizeQualityText,
  validateScenarioQualityPolicy,
} from "../public/demos/manzai-training/scenario-quality.js";

const policy = validateScenarioQualityPolicy(
  JSON.parse(
    await readFile(
      new URL("../public/demos/manzai-training/config/scenario-quality-policy.json", import.meta.url),
      "utf8",
    ),
  ),
);

test("quality policy declares every supported language and audit mode", () => {
  assert.deepEqual(policy.languages, ["ja", "en", "zh"]);
  assert.equal(policy.mode, "audit");
});

test("normalization removes compatibility, case, spacing, and punctuation differences", () => {
  assert.equal(
    normalizeQualityText(" Ａ-B! ", policy.normalization),
    normalizeQualityText("ab", policy.normalization),
  );
});

test("scenario inspection reports duplicate choices and flat scores with stable rule IDs", () => {
  const scenario = makeScenario("sample", [
    makeBeat("first-beat", [
      choice("first", "同じ回答", 50),
      choice("second", "別の回答", 50),
    ]),
    makeBeat("second-beat", [
      choice("third", "同じ、回答。", 80),
      choice("fourth", "固有の回答", 20),
    ]),
  ]);

  const diagnostics = analyzeScenarioQuality(scenario, policy);
  assert.ok(diagnostics.some(({ ruleId }) => ruleId === "SCORES_NOT_DIFFERENTIATED"));
  assert.ok(diagnostics.some(({ ruleId }) => ruleId === "CHOICE_DUPLICATE_WITHIN_SCENARIO"));
});

test("catalog inspection reports preferred choice, choice, dialogue, and feedback reuse", () => {
  const strictCounts = structuredClone(policy);
  strictCounts.rules.CHOICE_OVERUSED_ACROSS_CATALOG.maxOccurrences = 1;
  strictCounts.rules.DIALOGUE_OVERUSED_ACROSS_CATALOG.maxOccurrences = 1;
  strictCounts.rules.FEEDBACK_OVERUSED_ACROSS_CATALOG.maxOccurrences = 1;
  const first = makeScenario("first-scenario", [
    makeBeat("opening", [choice("best", "固有の最良回答", 80), choice("weak", "弱い回答一", 10)]),
  ]);
  const second = makeScenario("second-scenario", [
    makeBeat("opening", [choice("best", "固有の最良回答", 80), choice("weak", "弱い回答二", 10)]),
  ]);
  const catalog = {
    scenarios: [
      { id: first.id, categoryId: "sample-category" },
      { id: second.id, categoryId: "sample-category" },
    ],
  };

  const diagnostics = analyzeScenarioCatalogQuality(
    catalog,
    new Map([[first.id, first], [second.id, second]]),
    strictCounts,
  );
  const ruleIds = new Set(diagnostics.map(({ ruleId }) => ruleId));
  assert.ok(ruleIds.has("CHOICE_REUSED_WITHIN_CATEGORY"));
  assert.ok(ruleIds.has("CHOICE_OVERUSED_ACROSS_CATALOG"));
  assert.ok(ruleIds.has("DIALOGUE_OVERUSED_ACROSS_CATALOG"));
  assert.ok(ruleIds.has("FEEDBACK_OVERUSED_ACROSS_CATALOG"));
});

test("a narrow exception removes only its matching catalog occurrence", () => {
  const policyWithException = structuredClone(policy);
  policyWithException.rules.CHOICE_OVERUSED_ACROSS_CATALOG.maxOccurrences = 1;
  policyWithException.exceptions.push({
    ruleId: "CHOICE_OVERUSED_ACROSS_CATALOG",
    scope: { scenarioId: "second-scenario", language: "ja" },
    reason: "Approved test exception for one localized occurrence.",
  });
  const first = makeScenario("first-scenario", [
    makeBeat("opening", [choice("best", "共通回答", 80), choice("weak", "弱い回答一", 10)]),
  ]);
  const second = makeScenario("second-scenario", [
    makeBeat("opening", [choice("best", "共通回答", 80), choice("weak", "弱い回答二", 10)]),
  ]);
  const catalog = {
    scenarios: [
      { id: first.id, categoryId: "first-category" },
      { id: second.id, categoryId: "second-category" },
    ],
  };

  const diagnostics = analyzeScenarioCatalogQuality(
    catalog,
    new Map([[first.id, first], [second.id, second]]),
    policyWithException,
  );
  assert.ok(
    !diagnostics.some(
      ({ ruleId, language }) => ruleId === "CHOICE_OVERUSED_ACROSS_CATALOG" && language === "ja",
    ),
  );
  assert.ok(
    diagnostics.some(
      ({ ruleId, language }) => ruleId === "CHOICE_OVERUSED_ACROSS_CATALOG" && language === "en",
    ),
  );
});

test("policy validation rejects an unscoped exception", () => {
  const invalid = structuredClone(policy);
  invalid.exceptions.push({
    ruleId: "CHOICE_OVERUSED_ACROSS_CATALOG",
    scope: {},
    reason: "This deliberately invalid exception has no scope.",
  });
  assert.throws(() => validateScenarioQualityPolicy(invalid), /scope must not be empty/);
});

function makeScenario(id, beats) {
  return { id, beats };
}

function makeBeat(id, choices) {
  return {
    id,
    boke: localized("同じ対話"),
    reaction: { motionTags: [`pose:${id}`] },
    choices,
  };
}

function choice(id, text, contentPoints) {
  return {
    id,
    text: localized(text),
    axisScores: { clarity: contentPoints },
    feedback: localized("同じ講評"),
  };
}

function localized(value) {
  return { ja: value, en: value, zh: value };
}
