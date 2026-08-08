# Manzai Training MVP

A Japanese voice-recognition training demo built on the Perxona Presenter. The avatar plays the `boke`; after playback is
fully finished, the learner speaks one of the displayed `tsukkomi` choices. The demo identifies the choice, scores its
pre-authored content quality, adds a response-timing score, and advances to the next beat.

Scenario titles, boke captions, and tsukkomi choices are displayed simultaneously in Japanese, English, and Traditional
Chinese. Before initializing the Presenter, the learner can choose English, Traditional Chinese, or Japanese for the
character's spoken boke. The Voice picker is filtered to voices whose catalog metadata supports the selected speech language.
Browser speech recognition and response scoring use the same selected language: `en-US` for English, `zh-TW` for Traditional
Chinese, and `ja-JP` for Japanese.

Each scenario beat also declares a reaction. The demo resolves its preferred motion tags against the selected Avatar's live
motion catalog and embeds only a verified Motion ID in the text sent to the Presenter. If the Avatar has none of the requested
motions, playback safely falls back to the Presenter's automatic speaking gesture.

## Run

Start the Express sample from `samples/express` and open:

```text
http://localhost:8083/demos/manzai-training/
```

Chrome or Edge is recommended because the MVP uses the browser `SpeechRecognition` API with `ja-JP`. Microphone permission is
required. Browser speech recognition may send audio to a browser-vendor recognition service; this demo does not create or
store audio recordings itself.

## Flow

1. Load the Connect catalog and choose a speech language, avatar, scene, and compatible voice.
2. Initialize `<sv-presenter>` and unlock audio from the launch-button gesture.
3. Resolve the beat's reaction tags against the selected Avatar's motion catalog.
4. Play the localized `boke` and verified Motion Markup with `presenter.present()`.
5. Wait for `ALL_PERFORMANCE_FINISHED`, set the avatar to Listening, and start recognition.
6. Recognize the learner in the selected language and compare the final transcript with that language's choice text.
7. Score content out of 80 and response timing out of 20.
8. Show feedback for two seconds, then automatically advance to the next beat (or the final result).

The replay and manual-next buttons remain available during the two-second feedback window. Their handlers clear the pending
timer before changing state, as do restart, Presenter reconfiguration, and language changes.

Recognition is never active while the avatar is speaking, which prevents the Presenter audio from being treated as the
learner's answer.

## Files

- `app.js` — Presenter integration and UI state transitions.
- `speech-recognizer.js` — small `SpeechRecognition` adapter.
- `reaction-resolver.js` — safe reaction-tag to Avatar-motion resolution and Motion Markup generation.
- `evaluator.js` — Japanese normalization, fuzzy choice matching, and timing score.
- `scenario-controller.js` — scenario progress and summary calculation.
- `scenarios/convenience-store.json` — editable training script and authored scores.

## Authoring scenarios

Each beat needs a localized `boke` and at least two localized choices. Every localized value requires `ja`, `en`, and `zh`.
`contentPoints` is capped at 80. A simple `aliases` array is treated as Japanese. For multilingual aliases, use an object with
`ja`, `en`, and `zh` arrays:

```json
{
  "id": "example",
  "boke": {
    "ja": "ボケ役が話す文章",
    "en": "The line spoken by the boke",
    "zh": "裝傻角色說的台詞"
  },
  "reaction": {
    "description": {
      "ja": "得意げに紹介する",
      "en": "Present it proudly",
      "zh": "得意地介紹"
    },
    "motionTags": ["pose:showcase_02", "category:talking"],
    "variant": 0,
    "priority": 1,
    "cue": "start"
  },
  "choices": [
    {
      "id": "example-best",
      "text": {
        "ja": "画面に表示するツッコミ",
        "en": "The comeback shown on screen",
        "zh": "畫面上顯示的吐槽"
      },
      "aliases": {
        "ja": ["認識されそうな言い換え"],
        "en": ["An equivalent English phrase"],
        "zh": ["意思相同的中文說法"]
      },
      "contentPoints": 80,
      "feedback": "採点後に表示する説明"
    }
  ]
}
```

`motionTags` are checked in order. `variant` chooses among motions sharing the first available tag, `priority` becomes the
Motion Markup priority, and `cue` places the motion at the start or end of the spoken line. An optional `motionId` can pin an
exact catalog motion, but tag-based authoring is preferred because Motion IDs vary between Avatars.

The MVP chooses the phrase with the highest normalized Levenshtein similarity. It asks the user to retry when the best score
is below `0.48`. Content quality is deterministic and authored in the scenario; the MVP does not use an LLM to judge humor or
emotion.

## MVP limitations

- Browser speech-recognition support and accuracy vary by browser and operating system.
- Delivery quality such as volume, pitch, and speaking pace is not scored yet.
- Progress and results are held in memory and disappear on refresh.
- There is one bundled scenario and no scenario-selection UI yet.
- Explicit reactions depend on the selected Avatar's motion catalog; unmatched reactions use automatic speaking gestures.
