---
paths:
  - "samples/express/public/demos/manzai-training/scenarios/**/*.json"
  - "samples/express/public/demos/manzai-training/config/**/*.json"
  - "samples/express/public/demos/manzai-training/schemas/**/*.json"
  - "samples/express/public/demos/manzai-training/scenario-quality.js"
  - "samples/express/scripts/*scenario*.mjs"
---

# Scenario generation and quality rules

Before creating, editing, or reviewing scenario content, read:

- `samples/express/public/demos/manzai-training/docs/scenario-generation-guide.md`
- `samples/express/public/demos/manzai-training/docs/scenario-quality-standards.md`
- `samples/express/public/demos/manzai-training/config/scenario-quality-policy.json`
- the scenario and catalog JSON Schemas referenced by the generation guide

Inspect the target category and multiple existing scenarios, but do not copy their dialogue, choices, feedback, or aliases as
templates. Keep scenario content, quality-policy changes, and exceptions in separate commits. Never weaken a quality rule or
add an exception only to make generated content pass.

Run `npm run validate:scenarios` and `npm run quality:scenarios` from `samples/express`. In `audit` mode, report new and
existing findings separately. In `enforce` mode, do not finish with error-level findings.
