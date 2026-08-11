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
| Machine-readable thresholds and severities | Scenario quality policy |
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
