import { readFile } from "node:fs/promises";

import {
  analyzeScenarioCatalogQuality,
  validateScenarioQualityPolicy,
} from "../public/demos/manzai-training/scenario-quality.js";

const demoDirectory = new URL(
  "../public/demos/manzai-training/",
  import.meta.url,
);
const scenariosDirectory = new URL("scenarios/", demoDirectory);
const policy = validateScenarioQualityPolicy(
  await readJson(new URL("config/scenario-quality-policy.json", demoDirectory)),
);
const catalog = await readJson(new URL("index.json", scenariosDirectory));
const scenariosById = new Map();

for (const entry of catalog.scenarios) {
  const filename = entry.path.replace("./scenarios/", "");
  scenariosById.set(entry.id, await readJson(new URL(filename, scenariosDirectory)));
}

const diagnostics = analyzeScenarioCatalogQuality(catalog, scenariosById, policy);
if (!process.argv.includes("--summary")) {
  for (const diagnostic of diagnostics) {
    const scope = [
      diagnostic.categoryId,
      diagnostic.scenarioId,
      diagnostic.beatId,
      diagnostic.choiceId,
      diagnostic.language,
    ].filter(Boolean).join("/");
    console.warn(
      `${diagnostic.severity.toUpperCase()} [${diagnostic.ruleId}]${scope ? ` ${scope}` : ""}: ${diagnostic.message}`,
    );
  }
}

const errorCount = diagnostics.filter(({ severity }) => severity === "error").length;
const warningCount = diagnostics.filter(({ severity }) => severity === "warning").length;
const mode = process.argv.includes("--enforce") ? "enforce" : policy.mode;
console.log(
  `Checked ${catalog.scenarios.length} scenarios in ${mode} mode: ${errorCount} errors, ${warningCount} warnings.`,
);

if (mode === "enforce" && errorCount > 0) process.exitCode = 1;

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}
