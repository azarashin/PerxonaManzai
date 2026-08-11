import assert from "node:assert/strict";
import test from "node:test";

import { localizedChoiceFeedback } from "../public/demos/manzai-training/evaluator.js";

const beat = {
  choices: [
    {
      id: "acknowledge-concern",
      feedback: {
        ja: "相手の懸念を受け止めています。",
        en: "You acknowledged the other person's concern.",
        zh: "你有接住對方的疑慮。",
      },
    },
  ],
};

test("completion feedback uses the player's native language", () => {
  assert.equal(
    localizedChoiceFeedback(beat, "acknowledge-concern", "en"),
    "You acknowledged the other person's concern.",
  );
  assert.equal(
    localizedChoiceFeedback(beat, "acknowledge-concern", "zh"),
    "你有接住對方的疑慮。",
  );
  assert.equal(
    localizedChoiceFeedback(beat, "acknowledge-concern", "ja"),
    "相手の懸念を受け止めています。",
  );
});

test("completion feedback preserves the recorded text when the choice is unavailable", () => {
  assert.equal(
    localizedChoiceFeedback(beat, "missing-choice", "en", "Recorded feedback"),
    "Recorded feedback",
  );
});
