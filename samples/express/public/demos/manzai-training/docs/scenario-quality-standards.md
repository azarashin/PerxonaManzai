# Scenario Quality Standards

English | [日本語](scenario-quality-standards.ja.md)

## 1. Purpose

These standards define what makes a Conversation Dojo scenario suitable for training. They complement the structural rules
in the JSON Schemas and the authoring workflow in the [scenario generation guide](scenario-generation-guide.md).

The standards apply to new scenarios and to deliberate revisions of existing scenarios. They do not require unrelated
scenario files to be rewritten whenever the checker changes. A separate catalog-improvement task should handle existing
violations before a new rule becomes a mandatory CI gate.

## 2. Sources of truth

| Concern | Source of truth |
| --- | --- |
| JSON shape, required properties, and value ranges | `../schemas/scenario.schema.json` and `../schemas/scenario-catalog.schema.json` |
| Authoring workflow and expected generator output | `scenario-generation-guide.md` |
| Content-quality intent, review criteria, and exceptions | This document |
| Machine-readable thresholds and severities | [`scenario-quality-policy.json`](../config/scenario-quality-policy.json) |
| Executable checks | `../../../scripts/check-scenario-quality.mjs` and `../scenario-quality.js` |

If these sources disagree, fix the disagreement rather than choosing whichever rule is easiest to satisfy. Schema validity is
necessary, but it is not evidence that a scenario is educationally useful.

## 3. Severity levels

| Severity | Meaning | Required action |
| --- | --- | --- |
| Error | A deterministic rule is violated and the scenario must not be accepted | Fix the content or add a reviewed exception |
| Warning | A measurable pattern is risky but may be intentional | Review it and either improve it or record why it is acceptable |
| Manual review | Meaning or safety cannot be decided reliably from JSON alone | A reviewer checks the scenario in context |

Generators must not weaken thresholds, change a rule from error to warning, or add an exception merely to make validation
pass.

## 4. Core quality principles

### 4.1 Scenario specificity

Every utterance should respond to the current situation, speaker intent, and relevant facts. A line that could be pasted into
many unrelated scenarios without alteration is usually too generic.

- Refer to the actual claim, concern, contradiction, offer, or decision in the beat.
- Make feedback explain the consequence of that particular response.
- Do not use delay or dismissal phrases as reusable filler.
- A conventional phrase such as a greeting or apology is acceptable when its function is explicit and the surrounding line
  remains situation-specific.

### 4.2 Meaningful choice contrast

Choices must represent different communication strategies, not cosmetic rewrites of the same answer.

- The best choice demonstrates the target skill in the current context.
- A partial choice should have a plausible strength and an identifiable omission or risk.
- A weak choice should illustrate a realistic failure mode, not an obviously absurd answer inserted only to be wrong.
- Differences should remain audible after punctuation, spacing, and polite-ending variations are removed.
- Aliases may capture realistic equivalent speech, but must not cause two choices to recognize the same utterance.

### 4.3 Scoring integrity

Scores must make the learning objective visible.

- Each declared evaluation axis measures a distinct skill relevant to the scenario.
- The axis maximums total 80 content points; completion supplies the remaining 20 points for a 100-point result.
- A fully effective response may earn all 80 content points.
- Partial responses normally earn 40–70 points and identify both what worked and what was missing.
- Ineffective, unsafe, or premise-accepting responses normally earn 0–30 points.
- Do not give every choice the same total or use different axis values that produce no meaningful ranking.

### 4.4 Catalog diversity

A catalog should teach transferable judgment rather than memorization of recurring stock answers.

- Do not reuse the same normalized choice as the preferred response in multiple scenarios in one category.
- Repeated phrases across the catalog must stay below the configured limit.
- Dialogue prompts, reactions, and feedback should not be copied as templates with only nouns replaced.
- In manzai, a generic retort such as `なんでやねん。` is acceptable only when it clearly addresses the authored
  contradiction or exaggeration. Prefer a line that names what is wrong with the premise.
- Category conventions do not excuse catalog-wide repetition. Teach multiple valid formulations and tactics.

### 4.5 Localization quality

Japanese, English, and Traditional Chinese versions must preserve the training distinction between choices.

- Translate intent, politeness, emotional force, and professional risk rather than word order.
- Do not collapse distinct source-language choices into the same translated sentence.
- Keep culturally dependent jokes, honorifics, and negotiation conventions understandable in each language.
- Feedback in every language must justify the same scoring decision.

### 4.6 Speech-recognition fitness

Displayed choices are spoken inputs and must be practical to recognize.

- Keep a response at or below the configured character limit in every language.
- Avoid choices distinguished only by punctuation or a short function word.
- Keep aliases short, natural, and owned by exactly one choice in a beat.
- Do not add broad fragments as aliases merely to increase recognition success.

### 4.7 State and branching quality

Use branching only when an earlier choice materially changes the later conversation.

- Every state variable represents an observable learning consequence such as trust, tension, or available concessions.
- State effects should be proportionate to the choice and explained by the ensuing dialogue.
- Every reachable branch must offer a valid continuation or deliberate ending.
- Do not create branches that immediately converge without any change in dialogue, available choices, or outcome.
- Keep a scenario linear when state would be decorative rather than instructional.

### 4.8 Safety and professional boundaries

Scenarios must not reward confident invention in high-impact contexts.

- Prefer fact checking, escalation, or qualified language for medical, legal, financial, identity, payment, allergy, safety,
  and regulated-policy decisions.
- Do not require a learner to speak real personal information.
- Clearly separate empathy from admission of liability when the distinction is part of the exercise.
- Do not frame coercion, humiliation, discrimination, or unsafe escalation as the preferred strategy.

## 5. Stable rule IDs

Diagnostics and exceptions use stable IDs so a failure can link back to its rationale.

| Rule ID | Default level | Evaluation | Requirement |
| --- | --- | --- | --- |
| `CHOICE_DUPLICATE_WITHIN_SCENARIO` | Error | Machine | A normalized choice or alias must not belong to different choices in one scenario |
| `CHOICE_REUSED_WITHIN_CATEGORY` | Error | Machine | A preferred response must not be reused in another scenario in the same category |
| `CHOICE_OVERUSED_ACROSS_CATALOG` | Error | Machine | A normalized response must not exceed the catalog limit |
| `DIALOGUE_OVERUSED_ACROSS_CATALOG` | Warning | Machine | Avatar dialogue must not exceed the catalog limit |
| `FEEDBACK_OVERUSED_ACROSS_CATALOG` | Error | Machine | Choice feedback must not exceed the catalog limit |
| `CHOICES_NOT_MEANINGFULLY_DISTINCT` | Manual review | Human | Choices must teach different strategies after localization |
| `SCORES_NOT_DIFFERENTIATED` | Error | Machine | Choices in a beat must not all have the same total score |
| `SPEECH_CHOICE_TOO_LONG` | Warning | Machine | Spoken text and aliases must respect the configured length |
| `MOTION_TAGS_NOT_VARIED` | Warning | Machine | Multi-beat scenarios should not use an identical reaction pattern throughout without reason |
| `LOCALIZATION_INTENT_DRIFT` | Manual review | Human | Every language must preserve intent and score justification |
| `BRANCH_STATE_NO_CONSEQUENCE` | Manual review | Human | State and branches must materially affect the exercise |
| `HIGH_IMPACT_UNVERIFIED_CLAIM` | Manual review | Human | High-impact advice and policy claims require safe handling |

Normalization for machine comparisons uses Unicode NFKC normalization, locale-insensitive lowercase conversion, and removal
of whitespace, punctuation, and symbols. The checker compares each language separately; a Japanese phrase is not compared
with its English translation.

The committed policy starts in `audit` mode because existing scenario content is intentionally outside the scope of the
quality-infrastructure change. Switch it to `enforce` only after a separate remediation change makes the current catalog pass
the error-level rules.

## 6. Good and poor contrasts

### Manzai

Poor repeated response:

```text
なんでやねん。
```

Better scenario-specific response:

```text
冷蔵庫に住んだら家賃より先に電気代で破産するわ！
```

The second response identifies the faulty premise and gives the learner a reusable technique: name the contradiction and
heighten its consequence.

### Customer service

Poor generic response:

```text
分かりました。少し考えさせてください。
```

Better scenario-specific response:

```text
提供時刻を確認します。その間に、すぐ用意できる料理へ変更することもできます。
```

The second response combines fact checking with an actionable alternative.

## 7. Exception policy

An exception is for an intentional product or teaching requirement, not for convenience.

Every exception must include:

- one rule ID;
- the narrowest affected category, scenario, beat, choice, language, or phrase;
- a concrete rationale;
- an owner or review reference when the rule affects safety;
- an expiry or follow-up condition when the exception is temporary.

An exception must not disable a rule for the entire catalog when a phrase-level or scenario-level exception is sufficient.
Changing generated content is normally preferable to adding an exception.

## 8. Author and reviewer workflow

1. Read the target category guidance and several scenarios in that category.
2. Draft the learning objective, evaluation axes, and intended contrast before writing final dialogue.
3. Write every choice and feedback item for the specific beat.
4. Localize intent independently in Japanese, English, and Traditional Chinese.
5. Run schema validation and the quality checker.
6. Resolve every error and review every warning.
7. Perform the manual-review rules in this document.
8. Report validation results and any approved exceptions.

Scenario generation is complete only when structural validation succeeds, automated quality checks meet the active policy,
and manual-review concerns have been resolved.

Run `npm run quality:scenarios` for the policy's committed mode. During the catalog-remediation work, use
`npm run quality:scenarios:enforce` to preview the future CI gate without changing the committed policy. Do not add the strict
command to the normal test pipeline until the existing catalog has been remediated in its separate change. Pass `-- --summary`
to either npm command when only the totals are needed.

## 9. Existing-catalog evaluation and remediation

Treat quality-infrastructure changes and scenario-content changes as separate work. Merge the infrastructure first, then
create a new branch from the updated default branch for scenario remediation. Do not change thresholds, severities, or
exceptions in the remediation branch unless a separately reviewed policy decision requires it.

### 9.1 Record a baseline

Run the following commands from `samples/express` before editing content:

```text
npm run validate:scenarios
npm run quality:scenarios -- --summary
```

Record the error and warning totals in the task or pull-request notes. These totals are the comparison point for each batch of
changes; do not hard-code them in documentation because they should decrease as the catalog improves.

Use the detailed command to inspect individual diagnostics:

```text
npm run quality:scenarios
```

In PowerShell, results can be narrowed to a scenario or rule without modifying files:

```powershell
npm run quality:scenarios 2>&1 | Select-String "after-a-breakup"
npm run quality:scenarios 2>&1 | Select-String "CHOICE_DUPLICATE_WITHIN_SCENARIO"
```

### 9.2 Choose a bounded batch

Improve one category, one small related group, or one scenario at a time. Prefer this order when repeated templates affect
many files:

1. generic preferred, partial, and weak choices;
2. repeated feedback;
3. repeated avatar dialogue;
4. overlapping or overly broad aliases;
5. scoring, localization, motion, and branching concerns.

Do not perform a catalog-wide search-and-replace with synonyms. Each revision must be authored from the scenario's facts,
speaker intent, learner role, and learning objective.

### 9.3 Evaluate meaning before editing

For each beat, write down:

- what the other speaker is claiming, feeling, or requesting;
- what skill the learner should demonstrate;
- the distinct strategy represented by every choice;
- why each strategy earns its axis scores;
- the expected conversational consequence;
- any safety, professional-boundary, or localization risk.

Automated diagnostics establish measurable problems, but they do not decide whether a response is empathetic, persuasive,
funny, safe, or appropriate. Apply the manual-review rules in this document before accepting rewritten content.

### 9.4 Revise and localize

Rewrite choices and feedback together so the score justification remains accurate. Preserve the intended strategic contrast
in Japanese, English, and Traditional Chinese rather than translating word for word. Recheck aliases after finalizing the
displayed choices. If the scenario branches, verify that revised choices still produce proportionate state effects and
coherent routes.

An exception is not a substitute for rewriting generic content. If an exception is genuinely required, propose it as a
separate policy change with the evidence required by section 7.

### 9.5 Verify each batch

After every bounded batch, run:

```text
npm run validate:scenarios
npm run quality:scenarios -- --summary
npm test
```

Compare the new totals with the recorded baseline and inspect the detailed output for the modified scenarios. The batch is
ready to commit when:

- structural validation and tests pass;
- the targeted findings are resolved;
- total error and warning counts do not increase without a documented reason;
- no scenario outside the declared scope was changed;
- the manual-review checklist has been completed.

Prefer one commit per category or other reviewable batch. State the before-and-after totals in the commit or pull-request
notes.

### 9.6 Enable enforcement only after remediation

When all planned batches are complete, preview the future gate:

```text
npm run quality:scenarios:enforce -- --summary
```

This command is expected to fail while any error-level finding remains. After it succeeds, change the committed policy from
`audit` to `enforce` in a separate infrastructure commit, add the enforcing command to CI, and run the complete test suite
again.

## 10. Generator request template for remediation

Use a prompt similar to the following for Codex, Claude Code, or another repository-aware generator:

```text
Evaluate and improve scenario quality for <category-or-scenario>.

Before editing, read the scenario generation guide, scenario quality standards,
scenario quality policy, and both scenario JSON Schemas. Inspect multiple scenarios
in the target category.

Constraints:
- First report the findings and proposed revisions.
- Modify only the declared scenario or category scope.
- Do not change quality thresholds, severities, or exceptions.
- Do not replace repeated lines with superficial synonyms.
- Give every choice a scenario-specific and meaningfully distinct strategy.
- Keep score explanations consistent with the evaluation axes.
- Preserve the learning distinction in ja, en, and zh.
- Run schema validation, quality audit, and tests.
- Report before-and-after finding totals and any remaining manual-review concerns.
```

For an evaluation-only task, add: `Do not modify files in this phase.` Review the report before authorizing content changes.

## 11. Generator request templates for new content

Replace every value in angle brackets before using these prompts. State explicit safety, compliance, tone, and audience
requirements instead of expecting the generator to infer them.

### 11.1 Add a scenario to an existing category

```text
Add a new scenario to the existing <category-id> category.

Scenario requirements:
- Scenario ID: <scenario-id>
- Setting: <concrete situation>
- Learner role: <role>
- Avatar role: <role>
- Target audience and difficulty: <audience-and-difficulty>
- Learning objective: <observable skill>
- Desired beat count: <count>
- Safety or professional constraints: <constraints>

Before editing, read the scenario generation guide, scenario quality standards,
scenario quality policy, pronunciation-guide authoring guide, and both scenario
JSON Schemas. Inspect the target category entry in scenarios/index.json and
multiple scenarios in that category, but do not copy their dialogue, choices,
feedback, or aliases.

First summarize the proposed situation, evaluation axes, choice-strategy contrast,
and branching decision. Then implement the scenario unless a blocking ambiguity
would materially change the training objective.

Constraints:
- Modify only the new scenario file and the registration required in scenarios/index.json.
- Preserve $schema and use unique lowercase kebab-case IDs.
- Follow the category's branching.requirement and localized branching.rationale.
- Keep the scenario linear when earlier choices have no later consequence; when
  branching is used, make state changes and routes materially affect later dialogue.
- Define distinct, scenario-specific evaluation axes whose maxPoints total 80.
- Give every beat meaningfully different best, partial, and weak or unsafe strategies.
- Keep feedback consistent with axisScores and explain the consequence of that choice.
- Preserve the same learning distinction in ja, en, and Traditional Chinese zh.
- Add pronunciationGuide to every boke and choice text: full-line hiragana for ja,
  broad General American IPA in /slashes/ for en, and tone-marked Hanyu Pinyin for zh.
- Keep spoken choices practical for speech recognition and aliases narrow and unambiguous.
- Do not change quality thresholds, severities, exceptions, schemas, or unrelated scenarios.
- Do not weaken safety or professional boundaries to make a choice more dramatic.

Run from samples/express:
- npm run validate:scenarios
- npm run quality:scenarios -- --summary
- npm test

Report the files changed, category and scenario IDs, beat count, branching decision,
scoring approach, validation results, before-and-after quality finding totals, and
remaining manual-review items. Do not commit or push unless explicitly requested.
```

### 11.2 Add a category and representative scenarios

```text
Add a new <category-id> category and <scenario-count> representative scenarios.

Category requirements:
- Localized title and scope: <ja-en-zh-title-and-scope>
- Learner roles and counterpart roles: <roles>
- Transferable skills: <skills>
- Intended difficulty range: <range>
- Safety or professional boundaries: <boundaries>
- Candidate situations: <situations>

Before editing, read the scenario generation guide, scenario quality standards,
scenario quality policy, pronunciation-guide authoring guide, both scenario JSON
Schemas, and scenarios/index.json. Compare the proposal with all existing categories
and inspect multiple scenarios from the closest categories.

First report:
- whether this category is sufficiently distinct or should be incorporated into an existing category;
- its learning boundary and the situations that are explicitly out of scope;
- branching.requirement (not-required, recommended, or required) and a concrete
  ja/en/zh rationale;
- the proposed scenario set, difficulty progression, evaluation axes, and safety risks.

If the category would substantially duplicate an existing category, stop after the
report and request a scope decision. Otherwise, proceed with implementation.

Constraints:
- Add one category entry and the required scenario registrations to scenarios/index.json.
- Create complete scenario JSON files using the shared scenario schema; do not create
  a category-specific schema unless the runtime data model genuinely changes.
- Preserve $schema and use stable, unique lowercase kebab-case IDs.
- Make the representative scenarios cover different situations and communication
  strategies rather than noun-swapped versions of one template.
- Follow the declared branching guidance in every scenario and use consequential
  state and routes whenever branching is required.
- Give every scenario specific evaluation axes totaling 80 content points and choices
  with meaningfully different best, partial, and weak or unsafe strategies.
- Keep feedback, axisScores, state effects, and outcomes mutually consistent.
- Preserve training intent independently in ja, en, and Traditional Chinese zh.
- Add pronunciationGuide to every boke and choice text using hiragana, broad General
  American IPA, and tone-marked Hanyu Pinyin respectively.
- Keep choices suitable for speech recognition and avoid preferred-response, dialogue,
  feedback, and alias reuse within the category and across the catalog.
- Do not change quality thresholds, severities, exceptions, or unrelated content.
- Do not invent authoritative medical, legal, financial, identity, payment, or safety claims.

Run from samples/express after each reviewable scenario or category batch:
- npm run validate:scenarios
- npm run quality:scenarios -- --summary
- npm test

Report the category definition, scenarios and beat counts, branching design, scoring
strategy, files changed, validation results, before-and-after quality finding totals,
and all remaining localization, pronunciation, safety, or domain-expert review items.
Do not commit or push unless explicitly requested.
```
