import assert from "node:assert/strict";
import test from "node:test";

import {
  SPEECH_RECOGNITION_TIMEOUT_MS,
  SpeechRecognizer,
} from "../public/demos/manzai-training/speech-recognizer.js";

test("speech recognition allows 18 seconds by default", () => {
  const originalWindow = globalThis.window;
  let scheduledTimer;

  class FakeRecognition {
    start() {}

    stop() {
      this.stopped = true;
    }

    abort() {}
  }

  globalThis.window = {
    SpeechRecognition: FakeRecognition,
    setTimeout(callback, delay) {
      scheduledTimer = { callback, delay };
      return 1;
    },
    clearTimeout() {},
  };

  try {
    const recognizer = new SpeechRecognizer({
      onInterim() {},
      onFinal() {},
      onError() {},
      onEnd() {},
    });

    recognizer.start();

    assert.equal(SPEECH_RECOGNITION_TIMEOUT_MS, 18000);
    assert.equal(scheduledTimer.delay, SPEECH_RECOGNITION_TIMEOUT_MS);
    scheduledTimer.callback();
    assert.equal(recognizer.recognition.stopped, true);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});
