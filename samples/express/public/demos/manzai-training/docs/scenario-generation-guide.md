# Scenario Generation Guide for Codex

Use this guide when asking Codex or another generator to create or update training scenarios. The JSON Schemas define the
machine-readable shape; this guide defines which artifacts to produce and the content-quality expectations that schemas
cannot enforce.

Before authoring content, read the [scenario quality standards](scenario-quality-standards.md). The standards define the
quality rationale, stable diagnostic IDs, manual-review criteria, and exception policy used by all scenario generators.
When adding readings, also follow the dedicated
[pronunciation guide authoring instructions](pronunciation-guide-authoring.md).

## Choose the schema

| Task | Schema | Artifact |
| --- | --- | --- |
| Create or edit the dialogue, reactions, choices, scores, aliases, or feedback for one scenario | `../schemas/scenario.schema.json` | `../scenarios/<scenario-id>.json` |
| Add or edit categories, register a scenario, rename catalog titles, or change scenario paths | `../schemas/scenario-catalog.schema.json` | `../scenarios/index.json` |
| Create a scenario in an existing category | Both | A scenario JSON file and an updated `index.json` |
| Create a scenario in a new category | Both | A scenario JSON file plus the new category and scenario entries in `index.json` |

Do not create a new schema for each category or scenario. Manzai, customer service, and future categories share the same
scenario schema. Add a new schema only when the runtime data model changes.

## Information the prompt should provide

A generation prompt should state:

- the target category ID, or that a new category must be added;
- the category's `branching.requirement` and how the scenario follows its localized `branching.rationale`;
- the scenario ID and setting;
- the learner's role and the avatar's role;
- the training objective and target audience;
- the desired number of beats;
- the difficulty, tone, and safety or compliance requirements;
- whether the task may modify `scenarios/index.json`;
- that all authored text must have `ja`, `en`, and `zh` versions;
- whether the task includes pronunciation guides and, if so, the target scope and notation contract;
- that generated files must conform to the repository schemas;
- that `npm run validate:scenarios` and `npm test` must pass.

If a required content decision is missing, Codex may make a conservative assumption when it does not materially change the
training objective. It should ask before choosing a regulated policy, medical or legal response, or other high-impact rule.

## Recommended prompt

```text
Create a training scenario in this repository.

Category: customer-service
Scenario ID: hotel-check-in
Setting: A hotel guest checks in at the front desk
Learner role: Front-desk employee
Avatar role: Hotel guest
Objective: Practice polite identity confirmation and explaining breakfast hours
Audience: New hospitality staff
Difficulty: Beginner
Beats: 3
Tone: Professional and welcoming
Safety: Do not ask the learner to repeat sensitive personal information aloud

Requirements:
- Read schemas/scenario.schema.json and schemas/scenario-catalog.schema.json.
- Create scenarios/hotel-check-in.json with ja, en, and zh text.
- Register it under the existing customer-service category in scenarios/index.json.
- Keep $schema in both JSON files.
- Use lowercase kebab-case and unique IDs.
- Include at least two meaningfully different response choices per beat.
- Define scenario-specific `evaluationAxes`; their `maxPoints` must total 80.
- Give every choice an `axisScores` entry for every declared axis. Each score must be an integer from 0 through that axis's `maxPoints`.
- Use axes that explain the skill being trained (for example empathy, fact checking, or premise recognition), and explain the overall judgment in `feedback`.
- If pronunciation guides are requested, use full-line hiragana for `ja`, broad General American IPA in `/slashes/` for `en`, and tone-marked Hanyu Pinyin for `zh`. Follow `docs/pronunciation-guide-authoring.md` and report uncertain readings instead of guessing.

## State and branching

Keep a scenario linear when earlier choices do not materially change the later conversation. When the catalog marks branching as recommended or required, use these fields:

- `startBeatId`: optional entry beat; otherwise the first beat is used.
- `stateVariables`: typed `number`, `boolean`, or `string` values with localized labels and descriptions. Number state may declare `minimum` and `maximum`.
- `stateEffects`: choice-level updates. Use `set` for any matching type and `add` only for numbers.
- `routes`: ordered choice-level destinations evaluated after state effects. Every route set must end with an unconditional fallback. Use `nextBeatId: null` to finish.

```json
{
  "startBeatId": "hear-complaint",
  "stateVariables": [{
    "id": "trust",
    "label": { "ja": "信頼", "en": "Trust", "zh": "信任" },
    "description": { "ja": "顧客との信頼度", "en": "Customer trust level", "zh": "顧客信任程度" },
    "type": "number",
    "initialValue": 0,
    "minimum": -2,
    "maximum": 2
  }],
  "choice": {
    "stateEffects": [{ "stateId": "trust", "operation": "add", "value": 1 }],
    "routes": [
      {
        "conditions": [{ "stateId": "trust", "operator": "greater-than-or-equal", "value": 1 }],
        "nextBeatId": "seek-resolution"
      },
      { "nextBeatId": "customer-escalates" }
    ]
  }
}
```

All referenced state and beat IDs must exist. Conditions within one route are ANDed; routes use the first match. Avoid loops unless repetition is a deliberate training mechanic.
- Prefer portable motionTags over motionId.
- Do not add fields that are absent from the schema.
- Run npm run validate:scenarios and npm test.

Return a concise summary of files changed, the scenario's learning design, and validation results.
```

Paths in a prompt may be written relative to `public/demos/manzai-training/`. When ambiguity is possible, give the full
repository-relative path.

## What Codex should produce

For a repository-editing task, Codex should:

1. Read both schemas, this guide, the catalog, and at least one existing scenario in the target category.
2. Read the target category's `branching` guidance. Keep `not-required` scenarios linear, explain why a linear scenario is
   acceptable for `recommended`, and do not generate a `required` scenario until the runtime schema supports its branches.
3. Create or edit the scenario file.
4. Update the catalog when registration or category changes are required.
5. Run `npm run validate:scenarios` and `npm test`.
6. Return a concise final summary containing:
   - files created or changed;
   - category, scenario ID, and number of beats;
   - the learning objective and scoring approach;
   - validation and test results;
   - any assumptions that affect content meaning or safety.

The final response should not repeat the entire JSON when the files were written to the repository. If the user requests
content without repository edits, return complete strict-JSON artifacts in separate code blocks labelled with their intended
filenames. Do not return fragments, JavaScript object literals, comments inside JSON, or prose inside a JSON code block.

## Scenario authoring rules

- Keep the top-level `$schema` value as `../schemas/scenario.schema.json`.
- Use a stable lowercase kebab-case scenario ID and make it equal to the catalog entry ID.
- Keep catalog and scenario titles identical in all three languages.
- Give every beat and choice a unique lowercase kebab-case ID within the scenario.
- Set the catalog entry's `beatCount` to the exact number of items in the scenario's `beats` array.
- Set `difficulty`, `estimatedMinutes`, and localized `learningObjectives` in every catalog entry.
- Author translations for meaning and training intent, not word-for-word similarity.
- Add display-only `pronunciationGuide` metadata to every bundled beat and choice, keep all three languages together, and do
  not use it for speech recognition or scoring. The Schema field remains optional only for compatibility with external and
  older scenarios.
- Keep spoken choices short and distinct enough for browser speech recognition.
- Add aliases only for realistic equivalent utterances; do not use aliases to make different answers indistinguishable.
- Provide at least two choices. Three choices are recommended when a useful best, partial, and weak or unsafe contrast exists.
- Reserve `80` content points for a response that fully satisfies the learning objective.
- Use roughly `40–70` for a useful but incomplete response and `0–30` for an ineffective, unsafe, or premise-accepting response.
- Explain why each response earned its score without exposing private data or requiring free-form learner input.
- List portable `motionTags` from most specific to broadest fallback. Use `motionId` only when an exact Avatar-specific motion
  is an explicit requirement.

For customer-service content, avoid presenting guesses as facts, especially for allergies, safety, refunds, identity,
payments, or regulated policies. Prefer escalation or verification when the staff member should not decide independently.
For manzai content, score whether the response identifies the authored contradiction or exaggeration; do not rely on an LLM
to judge humor dynamically.

## Validation contract

Run both commands from `samples/express`:

```text
npm run validate:scenarios
npm test
```

The first command checks the schema-aligned structure and repository-level relationships, including IDs, translations,
unknown properties, scoring ranges, catalog references, file existence, and matching catalog/scenario titles. The second
command includes that validation and the application unit tests. Generation is not complete until both commands succeed.
For pronunciation-guide work, also preview every affected scenario language with a different player native language, toggle
the guide off and on, and check a mobile-width layout. Record unresolved pronunciation questions for human review.
