import test from "node:test";
import assert from "node:assert/strict";

import { scenarioDisplayLanguages } from "../public/demos/manzai-training/scenario-languages.js";

test("scenario display contains the character and player languages", () => {
  assert.deepEqual(scenarioDisplayLanguages("en", "ja"), ["en", "ja"]);
});

test("scenario display does not duplicate a shared language", () => {
  assert.deepEqual(scenarioDisplayLanguages("zh", "zh"), ["zh"]);
});

test("scenario display can hide the player language", () => {
  assert.deepEqual(scenarioDisplayLanguages("en", "ja", false), ["en"]);
});
