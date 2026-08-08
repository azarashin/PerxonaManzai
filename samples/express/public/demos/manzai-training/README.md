# Manzai Training MVP

A Japanese voice-recognition training demo built on the Perxona Presenter. The avatar plays the `boke`; after playback is
fully finished, the learner speaks one of the displayed `tsukkomi` choices. The demo identifies the choice, scores its
pre-authored content quality, adds a response-timing score, and advances to the next beat.

## Run

Start the Express sample from `samples/express` and open:

```text
http://localhost:8083/demos/manzai-training/
```

Chrome or Edge is recommended because the MVP uses the browser `SpeechRecognition` API with `ja-JP`. Microphone permission is
required. Browser speech recognition may send audio to a browser-vendor recognition service; this demo does not create or
store audio recordings itself.

## Flow

1. Load the Connect catalog and choose an avatar, scene, and voice.
2. Initialize `<sv-presenter>` and unlock audio from the launch-button gesture.
3. Play the current `boke` with `presenter.present()`.
4. Wait for `ALL_PERFORMANCE_FINISHED`, set the avatar to Listening, and start recognition.
5. Compare the final transcript with every choice and its aliases.
6. Score content out of 80 and response timing out of 20.
7. Show feedback, then replay the beat or advance.

Recognition is never active while the avatar is speaking, which prevents the Presenter audio from being treated as the
learner's answer.

## Files

- `app.js` — Presenter integration and UI state transitions.
- `speech-recognizer.js` — small `SpeechRecognition` adapter.
- `evaluator.js` — Japanese normalization, fuzzy choice matching, and timing score.
- `scenario-controller.js` — scenario progress and summary calculation.
- `scenarios/convenience-store.json` — editable training script and authored scores.

## Authoring scenarios

Each beat needs a `boke` and at least two choices. `contentPoints` is capped at 80. Add likely speech-recognition variants or
equivalent phrases to `aliases`:

```json
{
  "id": "example",
  "boke": "ボケ役が話す文章",
  "choices": [
    {
      "id": "example-best",
      "text": "画面に表示するツッコミ",
      "aliases": ["認識されそうな言い換え"],
      "contentPoints": 80,
      "feedback": "採点後に表示する説明"
    }
  ]
}
```

The MVP chooses the phrase with the highest normalized Levenshtein similarity. It asks the user to retry when the best score
is below `0.48`. Content quality is deterministic and authored in the scenario; the MVP does not use an LLM to judge humor or
emotion.

## MVP limitations

- Browser speech-recognition support and accuracy vary by browser and operating system.
- Delivery quality such as volume, pitch, and speaking pace is not scored yet.
- Progress and results are held in memory and disappear on refresh.
- There is one bundled scenario and no scenario-selection UI yet.
