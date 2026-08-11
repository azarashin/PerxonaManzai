# Pronunciation Guide Authoring

English | [日本語](pronunciation-guide-authoring.ja.md)

## Purpose and scope

Pronunciation guides help a learner read the scenario language aloud. They are display-only metadata and never change speech
recognition, aliases, scoring, feedback, or the text spoken by the avatar. The source `boke` or `text` remains the
authoritative utterance. Every spoken line in the bundled catalog must provide a guide; the Schema field remains optional for
compatibility with external and older scenarios.

Add `pronunciationGuide` only to:

- a beat, where it describes that beat's `boke`; or
- a choice, where it describes that choice's `text`.

When the field is present, it must contain `ja`, `en`, and `zh`. Do not add guides to titles, descriptions, feedback,
reaction descriptions, or aliases.

## Notation contract

| Language | Required notation | Example |
| --- | --- | --- |
| Japanese (`ja`) | Full-line hiragana reading | `こんびにに れいぞうこ うってへんわ！` |
| English (`en`) | Broad General American IPA enclosed in `/slashes/` | `/kənˈviniəns stɔɹz doʊnt sɛl ɹɪˈfɹɪdʒəˌɹeɪtəɹz/` |
| Traditional Chinese (`zh`) | Hanyu Pinyin with tone marks | `Biànlì shāngdiàn cái bú huì mài bīngxiāng lie!` |

Use spaces at useful phrase or word boundaries and retain sentence punctuation when it helps the learner follow the line.
Store every guide in Unicode NFC form.

For Japanese, convert kanji, katakana, numbers, and counters to the reading actually intended in the localized line. Preserve
dialectal pronunciation when it is part of the authored delivery. For English, use phonemic slashes rather than narrow
phonetic brackets and represent the intended natural reading of contractions. For Chinese, leave neutral tones unmarked and
show the intended spoken form of `一` and `不` consistently; do not guess at names or region-specific readings.

## Authoring workflow

1. Finalize and review the `boke` and choice `text` in all three languages first.
2. Add one guide beside every character line and player choice in the declared migration scope.
3. Read each guide against its same-language source text; never derive one language's guide from another translation.
4. Normalize the JSON text to Unicode NFC.
5. Run Schema validation and the scenario quality audit.
6. In the scenario preview, select each scenario language with a different player native language. Confirm that the guide is
   initially visible, the toggle hides it, and the native-language translation does not receive a second guide.
7. Check narrow and mobile layouts for wrapping and overflow.
8. Obtain fluent-speaker review for IPA, tone marks, proper names, dialect, and ambiguous readings before broad rollout.

Omit `pronunciationGuide` when a reviewed reading is unavailable. A missing guide is preferable to a confident but incorrect
teaching aid.

## Generator prompt requirements

When asking Codex, Claude, or another generator to add guides, include:

- the exact scenario or category scope;
- that existing dialogue, aliases, scores, feedback, routes, and quality policy must not change;
- the whole-line notation contract above;
- the intended English accent and Chinese romanization system;
- that every added guide needs all three languages and NFC normalization;
- that uncertain names, dialect, and alternative readings must be reported for human review instead of guessed;
- the required validation, quality-audit, unit-test, preview, and mobile checks.

Recommended request:

```text
Add pronunciationGuide metadata to <scenario-or-category>.

Before editing, read scenario.schema.json, scenario-catalog.schema.json,
scenario-generation-guide.md, scenario-quality-standards.md, and
pronunciation-guide-authoring.md. Inspect every localized utterance in scope.

Constraints:
- Modify only pronunciationGuide fields and tests or documentation directly required by this task.
- Keep all dialogue, aliases, scores, feedback, state, routes, thresholds, severities, and exceptions unchanged.
- Use full-line hiragana for ja, broad General American IPA in /slashes/ for en,
  and tone-marked Hanyu Pinyin for zh.
- Include ja, en, and zh whenever a pronunciationGuide is added.
- Store guides in Unicode NFC form.
- Report ambiguous readings for human review instead of guessing.
- Run npm run validate:scenarios, npm run quality:scenarios -- --summary, and npm test.
- Verify the scenario preview with the guide on and off at a mobile viewport.

Return guide coverage, validation results, and remaining human-review items.
```

## Rollout policy

The bundled catalog migration is complete: all 52 scenarios provide `pronunciationGuide` for every character line and player
choice. `convenience-store.json` remains the manually curated reference. Catalog tests enforce complete coverage and notation
shape for bundled scenarios. Keep the Schema field optional for external and older scenarios until the product explicitly
accepts that compatibility change, and continue fluent-speaker review of pronunciation accuracy.
