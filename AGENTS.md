# Repository Instructions

## Scenario authoring and review

When a task creates, edits, or reviews files under
`samples/express/public/demos/manzai-training/scenarios/`:

1. Read these files before changing scenario content:
   - `samples/express/public/demos/manzai-training/docs/scenario-generation-guide.md`
   - `samples/express/public/demos/manzai-training/docs/scenario-quality-standards.md`
   - `samples/express/public/demos/manzai-training/config/scenario-quality-policy.json`
   - both JSON Schemas referenced by the generation guide
2. Inspect the target category in `scenarios/index.json` and multiple existing scenarios in that category. Do not copy their
   dialogue, choices, feedback, or aliases as templates.
3. Keep scenario content, quality-policy changes, and policy exceptions in separate commits. Do not weaken a rule or add an
   exception merely to make generated content pass.
4. Run `npm run validate:scenarios` and `npm run quality:scenarios` from `samples/express`.
5. In `audit` mode, report new and existing findings separately. In `enforce` mode, do not finish with error-level findings.

The quality standards are the source of truth for semantic intent. The policy is the source of truth for machine-readable
thresholds and severities.
