import { readFile } from "node:fs/promises";

import { analyzeScenarioQuality } from "../public/demos/manzai-training/scenario-quality.js";

const scenariosDirectory = new URL(
  "../public/demos/manzai-training/scenarios/",
  import.meta.url,
);
const catalog = JSON.parse(
  await readFile(new URL("index.json", scenariosDirectory), "utf8"),
);
let warningCount = 0;

for (const entry of catalog.scenarios) {
  const filename = entry.path.replace("./scenarios/", "");
  const scenario = JSON.parse(
    await readFile(new URL(filename, scenariosDirectory), "utf8"),
  );
  for (const warning of analyzeScenarioQuality(scenario)) {
    warningCount += 1;
    console.warn(`WARNING ${entry.id}: ${warning}`);
  }
}

console.log(
  `Checked ${catalog.scenarios.length} scenarios: ${warningCount} quality warnings.`,
);
