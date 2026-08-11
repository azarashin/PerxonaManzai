import assert from "node:assert/strict";
import test from "node:test";

import { analyzeScenarioQuality } from "../public/demos/manzai-training/scenario-quality.js";

test("quality inspection reports ambiguous choices and flat scores", () => {
  const scenario = {
    beats: [
      {
        id: "sample",
        reaction: { motionTags: ["category:talking"] },
        choices: [
          choice("first", "同じ回答", 50),
          choice("second", "同じ回答", 50),
        ],
      },
    ],
  };

  const warnings = analyzeScenarioQuality(scenario);
  assert.ok(warnings.some((warning) => warning.includes("same total axis score")));
  assert.ok(warnings.some((warning) => warning.includes("shared by")));
});

function choice(id, text, contentPoints) {
  return {
    id,
    text: { ja: text, en: text, zh: text },
    axisScores: { clarity: contentPoints },
  };
}
