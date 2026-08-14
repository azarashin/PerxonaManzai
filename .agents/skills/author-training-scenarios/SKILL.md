---
name: author-training-scenarios
description: Create or extend multilingual training categories and scenario JSON files for the Perxona manzai-training demo. Use when asked to add a category, generate one or more scenarios, register scenarios in the catalog, or author branching, evaluation axes, choices, feedback, and pronunciation guides. Do not use for quality-only review of existing scenarios, quality-policy threshold or exception changes, or unrelated UI work.
---

# Author Training Scenarios

Create reviewable scenario content while preserving the repository's schemas, quality rules, localization intent, and safety boundaries.

## Establish the request

Identify these inputs from the request and repository. Ask only when a missing choice would materially change the result.

- Create a new category or extend an existing category.
- Define the scenario topic, difficulty, approximate dialogue count, and learning objectives.
- Decide whether branching is `not-required`, `recommended`, or `required`.
- Record explicit scope exclusions, safety concerns, and requested Git operations.

Treat commit, push, pull request, policy changes, and quality exceptions as separate authorization. Do not infer them from a request to create content.

## Read the sources of truth

Before editing any file under `samples/express/public/demos/manzai-training/scenarios/`, read all of the following completely:

1. `AGENTS.md`
2. `samples/express/public/demos/manzai-training/docs/scenario-generation-guide.md`
3. `samples/express/public/demos/manzai-training/docs/scenario-quality-standards.md`
4. `samples/express/public/demos/manzai-training/config/scenario-quality-policy.json`
5. `samples/express/public/demos/manzai-training/docs/pronunciation-guide-authoring.md`
6. `samples/express/public/demos/manzai-training/schemas/scenario.schema.json`
7. `samples/express/public/demos/manzai-training/schemas/scenario-catalog.schema.json`
8. `samples/express/public/demos/manzai-training/scenarios/index.json`

Inspect every category definition in the catalog. Compare the proposal with all categories, then read multiple complete scenarios from the closest category. For branching work, also read at least one complete scenario with meaningful state-based routing.

Do not copy dialogue, choices, feedback, aliases, score distributions, or state layouts as a template.

## Capture the baseline

From `samples/express`, run these commands before editing and record the category count, scenario count, and quality findings:

```text
npm run validate:scenarios
npm run quality:scenarios -- --summary
```

Keep pre-existing findings separate from findings introduced by the proposed content.

## Report the design before editing

Report these conclusions before changing scenario files:

- Whether a new category is sufficiently distinct or should be integrated into an existing category.
- The learning boundary and explicitly excluded situations.
- The branching requirement and concrete rationale in Japanese, English, and Traditional Chinese.
- Scenario candidates, difficulty progression, dialogue counts, evaluation axes, and safety risks.

If the proposal substantially overlaps existing content, stop after the report and ask the user to choose the scope. Otherwise, continue without waiting when implementation was authorized.

## Author the content

Use the shared scenario schema. Create a category-specific schema only when the runtime data model genuinely changes.

- Preserve `$schema` and use stable, unique, lowercase kebab-case IDs.
- Add exactly one catalog category entry when creating a category and register every new scenario in `scenarios/index.json`.
- Keep catalog metadata, scenario titles, dialogue counts, difficulty, objectives, paths, and scenario files consistent.
- Give every scenario situation-specific evaluation axes totaling 80 points.
- Provide semantically distinct best, partial, and weak or dangerous choices. Prefer approximately 80 for complete choices, 40–70 for partial choices, and 0–30 for weak choices unless the standards justify otherwise.
- Align feedback, `axisScores`, state effects, routes, and outcomes. Describe the actual strength or omission of the choice rather than repeating its text.
- Preserve distinct learning intent in Japanese, English, and Traditional Chinese. Translate intent, not surface wording.
- Add `pronunciationGuide` to every `boke` and choice `text`: hiragana for Japanese, broad General American IPA between slashes for English, and tone-marked Hanyu Pinyin for Traditional Chinese.
- Keep spoken choices concise and suitable for speech recognition.
- Avoid catalog-wide reuse of preferred answers, dialogue, feedback, and aliases.
- Do not invent authoritative medical, legal, financial, identity, payment, or safety claims. Use verification and appropriate escalation when consequences are high.

For `not-required`, use a linear flow unless state changes are necessary. For `recommended`, branch only where prior disclosure, pressure, trust, or another state changes the safe next response. For `required`, use meaningful state variables and routes that change reachable dialogue or outcomes; do not add decorative branches that immediately behave identically.

Do not change quality thresholds, severities, or exceptions to make content pass. Keep scenario content, policy changes, and exceptions in separate commits.

## Update tests

Update catalog expectations that intentionally track category, scenario, or utterance totals. Add focused controller tests for new branching behavior, including at least one safer path and one weaker path. Do not weaken catalog-wide pronunciation or quality assertions.

## Verify the change

Run the bundled verifier from the repository root:

```text
node .agents/skills/author-training-scenarios/scripts/verify-scenario-change.mjs
```

This runs the required schema validation, quality audit, and full test suite from `samples/express`. Fix introduced findings without changing policy or adding exceptions. In enforce mode, do not finish with error-level findings.

## Report the result

Report:

- Category definition and branching rationale.
- Scenario IDs, difficulty, dialogue counts, and route design.
- Evaluation axes and 80-point allocation.
- Changed files.
- Schema validation, quality audit, and test results.
- Quality findings before and after the change, separating pre-existing findings.
- Remaining translation, pronunciation, safety, and domain-expert review items.
- Whether commit or push was performed.

