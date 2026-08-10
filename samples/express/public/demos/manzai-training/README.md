# Scenario Training MVP

A multilingual, category-based conversation training demo built on the Perxona Presenter. The avatar plays the
conversation partner; after playback is fully finished, the learner answers by speaking or clicking one of the displayed
response choices. The demo identifies the choice, scores its pre-authored content quality, adds a response-timing score,
and advances to the next beat.

Before initializing the Presenter, the learner chooses both the scenario language and the player's native language.
Scenario titles, partner captions, and response choices show only those two languages, or one line when both selections match.
The character voice, browser speech recognition, and response matching follow the scenario language. Instructions, controls,
status messages, and scoring labels follow the player's native language. Supported recognition locales are `en-US` for
English, `zh-TW` for Traditional Chinese, and `ja-JP` for Japanese.

Completion tracking is optional and local-only. When the learner enables it, the browser stores only each scenario ID and
its completion count in `localStorage`. The demo server does not receive or store this progress, recognized learner text,
audio recordings, or learner identity. The Data and privacy dialog explains browser-storage limitations, warns that browser
speech recognition may send audio to an external service, and provides controls to import, export, or delete locally stored
progress. The progress dialog groups completion counts by category and scenario.

Each scenario beat also declares a reaction. The demo resolves its preferred motion tags against the selected Avatar's live
motion catalog and embeds only a verified Motion ID in the text sent to the Presenter. If the Avatar has none of the requested
motions, playback safely falls back to the Presenter's automatic speaking gesture.

## Run

Start the Express sample from `samples/express` and open:

```text
http://localhost:8083/demos/manzai-training/
```

Link directly to a scenario with query parameters:

```text
http://localhost:8083/demos/manzai-training/?category=customer-service&scenario=restaurant-service
```

Changing the category or scenario updates the URL without reloading the page. Invalid IDs safely fall back to the default
scenario.

Chrome or Edge is recommended for voice answers because the MVP uses the browser `SpeechRecognition` API. Microphone
permission is required only in voice mode. Click mode works without speech recognition or microphone access. Browser speech
recognition may send audio to a browser-vendor recognition service; this demo does not create or store audio recordings
itself.

## Flow

1. Choose a category and one of its scenarios. Use the completion filter, dialogue count, difficulty, estimated duration,
   and learning objectives to find suitable training; preview the full authored content when needed.
2. Load the Connect catalog and choose a speech language, avatar, scene, and compatible voice.
3. Choose voice or click answers, normal or randomized beat order, and optional automatic advancement.
4. Initialize `<sv-presenter>` and unlock audio from the launch-button gesture.
5. Resolve the beat's reaction tags against the selected Avatar's motion catalog.
6. Play the localized `boke` and verified Motion Markup with `presenter.present()`.
7. Wait for `ALL_PERFORMANCE_FINISHED`, then accept a spoken or clicked answer.
8. Score content out of 80 and response timing out of 20.
9. Show feedback and advance automatically when that option is enabled; otherwise use the manual-next button.
10. At completion, show the total and a per-beat breakdown of recognized speech, matched choice, scores, timing, similarity,
   and authored feedback.
11. Optionally review only the low-scoring beats; review runs do not increment the scenario completion count.

The replay and manual-next buttons remain available during the five-second feedback window. Their handlers clear the pending
timer before changing state, as do restart, Presenter reconfiguration, and language changes.

Recognition is never active while the avatar is speaking, which prevents the Presenter audio from being treated as the
learner's answer.

## Files

- `app.js` — Presenter integration and UI state transitions.
- `speech-recognizer.js` — small `SpeechRecognition` adapter.
- `reaction-resolver.js` — safe reaction-tag to Avatar-motion resolution and Motion Markup generation.
- `evaluator.js` — Japanese normalization, fuzzy choice matching, and timing score.
- `scenario-controller.js` — scenario progress and summary calculation.
- `scenario-catalog.js` — catalog validation and category filtering.
- `progress-storage.js` — opt-in, device-local completion counts.
- `schemas/scenario.schema.json` — JSON Schema for authored scenario files.
- `schemas/scenario-catalog.schema.json` — JSON Schema for the category and scenario catalog.
- `scenarios/index.json` — localized categories and the scenarios assigned to them.
- `scenarios/convenience-store.json` — editable training script and authored scores.
- `scenarios/restaurant-service.json` — customer-service training sample.

## Authoring scenarios

For Codex generation prompts, schema selection, required output artifacts, scoring guidance, and a reusable prompt template,
see [`docs/scenario-generation-guide.md`](docs/scenario-generation-guide.md). In short:

- use `schemas/scenario.schema.json` for each scenario file;
- use `schemas/scenario-catalog.schema.json` when categories or scenario registration change;
- a new scenario normally requires both a scenario JSON file and an updated `scenarios/index.json`;
- ask Codex to write complete files, preserve `$schema`, run validation, and return a short change and test summary.

Scenario files use JSON Schema Draft 2020-12 and declare their schema with `$schema`. Keep that property when generating a
scenario with Codex so compatible editors can provide completion and diagnostics. The schemas require lowercase kebab-case
IDs, all three translations (`ja`, `en`, and `zh`), at least one beat, at least two choices per beat, valid reaction metadata,
and integer `contentPoints` from 0 to 80. Unknown properties are rejected.

After adding or editing generated content, run:

```text
npm run validate:scenarios
npm run quality:scenarios
```

This repository-level validation also checks rules JSON Schema cannot express conveniently: unique beat and choice IDs,
catalog references, file existence, and matching scenario IDs and titles between the catalog and scenario files. `npm test`
runs this validation and the non-blocking quality warnings automatically. The scenario preview dialog shows all authored lines,
choices, scores, feedback, and reaction tags before training starts.

First add the category and scenario metadata to `scenarios/index.json`. Category and scenario IDs must be unique, and every
scenario's `categoryId` must reference a listed category. Each entry also defines `difficulty`, `estimatedMinutes`, and
localized `learningObjectives`. `beatCount` must match the scenario's `beats.length`; it is shown in the scenario picker,
which orders scenarios from fewest to most dialogues. Titles require `ja`, `en`, and `zh`. The scenario
`path` is resolved relative to the demo page. A category may be empty; selecting it shows no scenario and prevents training
from starting.

```json
{
  "categories": [
    { "id": "customer-service", "title": { "ja": "接客", "en": "Customer Service", "zh": "顧客服務" } }
  ],
  "scenarios": [
    {
      "id": "restaurant-service",
      "categoryId": "customer-service",
      "beatCount": 2,
      "difficulty": "beginner",
      "estimatedMinutes": 4,
      "learningObjectives": {
        "ja": ["丁寧に謝罪する"],
        "en": ["Apologize politely"],
        "zh": ["禮貌致歉"]
      },
      "title": { "ja": "レストランでの接客", "en": "Restaurant Customer Service", "zh": "餐廳顧客服務" },
      "path": "./scenarios/restaurant-service.json"
    }
  ]
}
```

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
      "feedback": {
        "ja": "採点後に表示する説明",
        "en": "Feedback shown after scoring",
        "zh": "評分後顯示的講評"
      }
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
- Detailed results remain in memory and disappear on refresh; only opted-in scenario completion counts persist locally.
- Explicit reactions depend on the selected Avatar's motion catalog; unmatched reactions use automatic speaking gestures.
