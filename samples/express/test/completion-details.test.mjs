import assert from "node:assert/strict";
import test from "node:test";

import { completionAnswerDetails } from "../public/demos/manzai-training/completion-details.js";

test("click answers omit recognized speech from completion details", () => {
  assert.deepEqual(
    completionAnswerDetails({
      inputMode: "click",
      transcript: "selected answer",
      choiceText: "Selected answer",
    }),
    [{ labelKey: "answeredContentLabel", value: "Selected answer" }],
  );
});

test("voice answers retain recognized speech and answered content", () => {
  assert.deepEqual(
    completionAnswerDetails({
      inputMode: "voice",
      transcript: "recognized answer",
      choiceText: "Matched answer",
    }),
    [
      { labelKey: "recognizedSpeechLabel", value: "recognized answer" },
      { labelKey: "answeredContentLabel", value: "Matched answer" },
    ],
  );
});
