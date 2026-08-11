import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultPronunciationGuideVisibility,
  pronunciationGuideText,
  scenarioDisplayLanguages,
} from "../public/demos/manzai-training/scenario-languages.js";

test("scenario display contains the character and player languages", () => {
  assert.deepEqual(scenarioDisplayLanguages("en", "ja"), ["en", "ja"]);
});

test("scenario display does not duplicate a shared language", () => {
  assert.deepEqual(scenarioDisplayLanguages("zh", "zh"), ["zh"]);
});

test("scenario display can hide the player language", () => {
  assert.deepEqual(scenarioDisplayLanguages("en", "ja", false), ["en"]);
});

test("pronunciation guides default on only for foreign-language training", () => {
  assert.equal(defaultPronunciationGuideVisibility("en", "ja"), true);
  assert.equal(defaultPronunciationGuideVisibility("ja", "ja"), false);
  assert.equal(defaultPronunciationGuideVisibility("unsupported", "ja"), false);
});

test("pronunciation guide uses only the selected scenario language", () => {
  const guide = { ja: "にほんご", en: "/ˈɪŋɡlɪʃ/", zh: "Zhōngwén" };
  assert.equal(pronunciationGuideText(guide, "en", true), "/ˈɪŋɡlɪʃ/");
  assert.equal(pronunciationGuideText(guide, "en", false), "");
  assert.equal(pronunciationGuideText(undefined, "en", true), "");
});
