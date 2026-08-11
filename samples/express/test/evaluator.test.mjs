import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateResponse,
  localizedChoiceFeedback,
} from "../public/demos/manzai-training/evaluator.js";

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

test("retry guidance uses the UI language instead of the recognition language", () => {
  const result = evaluateResponse(
    {
      choices: [
        {
          id: "english-choice",
          text: { ja: "こんにちは", en: "Hello", zh: "你好" },
          axisScores: {},
          feedback: { ja: "講評", en: "Feedback", zh: "講評" },
        },
      ],
    },
    "completely different response",
    2,
    "en",
    [],
    "ja",
  );

  assert.equal(result.matched, false);
  assert.equal(
    result.feedback,
    "表示された選択肢のどれかを、もう一度はっきり発声してください。",
  );
});
