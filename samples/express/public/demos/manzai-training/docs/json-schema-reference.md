# Scenario JSON Schema Reference

English | [日本語](json-schema-reference.ja.md)

## 1. Purpose

Conversation Dojo stores its category and scenario index in a catalog JSON file and each scenario in a separate JSON file. JSON Schema and custom validation catch structural, translation, scoring, and reference errors before a scenario is added.

| Subject | Schema | Data |
| --- | --- | --- |
| Categories and scenario index | [`scenario-catalog.schema.json`](../schemas/scenario-catalog.schema.json) | [`index.json`](../scenarios/index.json) |
| Scenario content | [`scenario.schema.json`](../schemas/scenario.schema.json) | `scenarios/*.json` |
| Quality policy | [`scenario-quality-policy.schema.json`](../schemas/scenario-quality-policy.schema.json) | [`scenario-quality-policy.json`](../config/scenario-quality-policy.json) |

Both schemas use JSON Schema Draft 2020-12 and reject undefined properties.

## 2. Shared rules

### IDs

Use lowercase kebab-case for category, scenario, evaluation-axis, state-variable, beat, and choice IDs.

```text
partner-communication
relationship-impact
confirm-next-steps
```

An ID is a persistent reference key, not display text. After publication, change the localized label rather than the ID so URLs, local progress, and branch references remain compatible.

### Localized text

Every `localizedText` object requires Japanese, English, and Traditional Chinese values.

```json
{
  "ja": "信頼",
  "en": "Trust",
  "zh": "信任"
}
```

Values may not be empty or contain only whitespace.

## 3. Scenario catalog

The catalog contains top-level `categories` and `scenarios` arrays.

### `categories`

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Category ID |
| `title` | Yes | Localized category name |
| `branching.requirement` | Yes | `not-required`, `recommended`, or `required` |
| `branching.rationale` | Yes | Localized explanation of the branching requirement |

`branching` guides scenario generation. Use the state and branching model for a `required` category. For `recommended`, decide based on difficulty and whether earlier events affect later dialogue.

### `scenarios`

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Must equal the scenario document's `id` |
| `categoryId` | Yes | ID of a declared category |
| `beatCount` | Yes | Positive integer equal to the scenario's `beats.length` |
| `difficulty` | Yes | `beginner`, `intermediate`, or `advanced` |
| `estimatedMinutes` | Yes | Positive integer duration estimate |
| `learningObjectives` | Yes | At least one objective in every supported language |
| `title` | Yes | Must equal the scenario document's `title` |
| `path` | Yes | Path in the form `./scenarios/<scenario-id>.json` |

The UI orders scenarios within a category by ascending `beatCount`.

## 4. Scenario document

### Top-level fields

| Field | Required | Description |
| --- | --- | --- |
| `$schema` | No | Normally `../schemas/scenario.schema.json` |
| `id` | Yes | Scenario ID |
| `title` | Yes | Localized title |
| `description` | Yes | Localized summary |
| `evaluationAxes` | Yes | Content-scoring axes whose maximums total 80 |
| `beats` | Yes | One or more dialogue nodes |
| `startBeatId` | No | Entry beat; defaults to the first element in `beats` |
| `stateVariables` | No | State declarations used by branching |

Omitting `startBeatId`, `stateVariables`, and choice-level `stateEffects` and `routes` produces a linear scenario that follows array order.

## 5. Evaluation axes

Content contributes 80 points and response timing contributes 20, for a maximum of 100 per dialogue. The final training score is the rounded average of completed dialogue scores and is therefore always out of 100.

Each item in `evaluationAxes` has these fields:

| Field | Description |
| --- | --- |
| `id` | Referenced by choice-level `axisScores` |
| `label` | Localized UI label |
| `description` | Localized explanation of what the axis measures |
| `maxPoints` | Axis maximum; all axis maximums must total 80 |

```json
"evaluationAxes": [
  {
    "id": "empathy",
    "label": { "ja": "共感", "en": "Empathy", "zh": "同理心" },
    "description": {
      "ja": "相手の感情を受け止める",
      "en": "Acknowledge the other person's feelings.",
      "zh": "理解對方的感受。"
    },
    "maxPoints": 30
  },
  {
    "id": "solution-quality",
    "label": { "ja": "解決策", "en": "Solution quality", "zh": "解決方案" },
    "description": {
      "ja": "実行可能な次の行動を示す",
      "en": "Offer an actionable next step.",
      "zh": "提出可執行的下一步。"
    },
    "maxPoints": 50
  }
]
```

Every choice must provide exactly one `axisScores` entry for every declared axis. Each score must be an integer from zero through that axis's `maxPoints`.

## 6. Beats and choices

### `beat`

| Field | Description |
| --- | --- |
| `id` | Beat ID, unique within the scenario |
| `boke` | Localized line spoken by the character |
| `reaction` | Performance instructions for the line |
| `choices` | Two or more player responses |

`reaction` requires a localized `description` and at least one `motionTags` entry. It may also specify `motionId`, `variant`, `priority`, and `cue`.

### `choice`

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Choice ID |
| `text` | Yes | Localized response |
| `aliases` | No | Alternative phrases matched as this response |
| `axisScores` | Yes | Content score for every evaluation axis |
| `feedback` | Yes | Localized feedback displayed after scoring |
| `stateEffects` | No | State updates applied when selected |
| `routes` | No | Ordered destinations evaluated after state updates |

An `aliases` array is treated as Japanese-only. Use an object with `ja`, `en`, and `zh` arrays for multilingual aliases.

## 7. State variables

`stateVariables` declares values retained across beats.

| Field | Description |
| --- | --- |
| `id` | State ID |
| `label` | Localized display label |
| `description` | Localized semantic definition |
| `type` | `number`, `boolean`, or `string` |
| `initialValue` | Initial value matching `type` |
| `minimum` | Optional lower bound for number state only |
| `maximum` | Optional upper bound for number state only |

The engine clamps updated number state to its declared `minimum` and `maximum`.

```json
{
  "id": "trust",
  "label": { "ja": "信頼", "en": "Trust", "zh": "信任" },
  "description": {
    "ja": "相手との信頼度",
    "en": "Trust level with the other person.",
    "zh": "與對方的信任程度。"
  },
  "type": "number",
  "initialValue": 0,
  "minimum": -2,
  "maximum": 3
}
```

## 8. State effects

The engine applies a choice's `stateEffects` in array order immediately after the response is scored. One choice may update a given state variable only once.

| `operation` | Supported type | Behavior |
| --- | --- | --- |
| `set` | All | Replace the current value |
| `add` | `number` only | Add to the current value |

```json
"stateEffects": [
  { "stateId": "trust", "operation": "add", "value": 1 },
  { "stateId": "needs-confirmed", "operation": "set", "value": true }
]
```

## 9. Conditional routes

The engine evaluates `routes` from first to last after applying state effects and takes the first matching route. Multiple conditions in one route use AND semantics.

| Operator | Meaning |
| --- | --- |
| `equals` | Equal |
| `not-equals` | Not equal |
| `greater-than` | Greater than; numbers only |
| `greater-than-or-equal` | Greater than or equal; numbers only |
| `less-than` | Less than; numbers only |
| `less-than-or-equal` | Less than or equal; numbers only |

The final route must be an unconditional fallback without `conditions`. Set `nextBeatId` to an existing beat ID, or to `null` to finish training.

```json
"routes": [
  {
    "conditions": [
      { "stateId": "trust", "operator": "greater-than-or-equal", "value": 2 },
      { "stateId": "needs-confirmed", "operator": "equals", "value": true }
    ],
    "nextBeatId": "successful-close"
  },
  { "nextBeatId": "guarded-close" }
]
```

Branching scenarios are not randomized. Review mode selects beats from the completed path and removes state effects and routes so that the review runs linearly without dangling references.

## 10. Validation

Run these commands from the Express sample directory:

```bash
npm run validate:scenarios
npm run quality:scenarios
npm test
```

In addition to JSON Schema structure, `validate:scenarios` checks cross-file and cross-field constraints that JSON Schema alone does not express conveniently:

- Unique category, scenario, beat, choice, evaluation-axis, and state-variable IDs
- Matching IDs, titles, and beat counts between catalog entries and scenario documents
- Evaluation-axis maximums totaling 80
- Every choice scoring every declared evaluation axis
- State initial values, effect values, and condition values matching their declared type
- Effects and conditions referencing declared state variables
- `startBeatId` and `nextBeatId` referencing existing beats
- A final unconditional fallback in every non-empty `routes` array

`quality:scenarios` reports content that is structurally valid but may reduce training quality, including shared response phrases, indistinguishable choice scores, overly long responses, and excessive repetition of the same motion.

See the [scenario generation guide](scenario-generation-guide.md) for the complete authoring workflow and prompt requirements.
