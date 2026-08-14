import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { verificationCommands } from "../../../.agents/skills/author-training-scenarios/scripts/verify-scenario-change.mjs";

const skillDirectory = new URL(
  "../../../.agents/skills/author-training-scenarios/",
  import.meta.url,
);

async function readSkillFile(path) {
  return readFile(new URL(path, skillDirectory), "utf8");
}

test("scenario authoring skill has valid discovery metadata", async () => {
  const skill = await readSkillFile("SKILL.md");
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";

  assert.match(frontmatter, /^name: author-training-scenarios$/mu);
  assert.match(frontmatter, /^description: .+$/mu);
  assert.doesNotMatch(frontmatter, /^\s*(?:license|allowed-tools|metadata):/mu);
  assert.doesNotMatch(skill, /\bTODO\b/u);
});

test("scenario authoring skill declares usable UI metadata", async () => {
  const metadata = await readSkillFile("agents/openai.yaml");

  assert.match(metadata, /display_name: "Scenario Authoring"/u);
  assert.match(metadata, /short_description: ".{25,64}"/u);
  assert.match(metadata, /default_prompt: "Use \$author-training-scenarios /u);
  assert.match(metadata, /allow_implicit_invocation: true/u);
});

test("scenario authoring skill requires canonical sources and checks", async () => {
  const skill = await readSkillFile("SKILL.md");
  const requiredReferences = [
    "scenario-generation-guide.md",
    "scenario-quality-standards.md",
    "scenario-quality-policy.json",
    "pronunciation-guide-authoring.md",
    "scenario.schema.json",
    "scenario-catalog.schema.json",
    "scenarios/index.json",
  ];

  for (const reference of requiredReferences) {
    assert.match(skill, new RegExp(reference.replaceAll(".", "\\."), "u"));
  }
  assert.match(skill, /Report the design before editing/u);
  assert.match(skill, /Do not change quality thresholds, severities, or exceptions/u);
});

test("scenario authoring workflow covers linear, branching, and overlap decisions", async () => {
  const skill = await readSkillFile("SKILL.md");

  assert.match(skill, /For `not-required`, use a linear flow/u);
  assert.match(skill, /For `recommended`, branch only where/u);
  assert.match(skill, /For `required`, use meaningful state variables and routes/u);
  assert.match(
    skill,
    /substantially overlaps existing content, stop after the report/u,
  );
});

test("scenario verifier runs validation, audit, and tests in order", () => {
  assert.deepEqual(
    verificationCommands.map(({ args }) => args),
    [
      ["run", "validate:scenarios"],
      ["run", "quality:scenarios", "--", "--summary"],
      ["test"],
    ],
  );
});
