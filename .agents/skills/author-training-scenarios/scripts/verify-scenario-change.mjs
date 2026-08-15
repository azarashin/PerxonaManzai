import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const verificationCommands = [
  {
    label: "Scenario schema validation",
    command: "npm",
    args: ["run", "validate:scenarios"],
  },
  {
    label: "Scenario quality audit",
    command: "npm",
    args: ["run", "quality:scenarios", "--", "--summary"],
  },
  {
    label: "Express sample tests",
    command: "npm",
    args: ["test"],
  },
];

export function runVerification({
  cwd = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../samples/express",
  ),
  platform = process.platform,
} = {}) {
  for (const step of verificationCommands) {
    console.log(`\n== ${step.label} ==`);
    const executable = platform === "win32" ? "cmd.exe" : step.command;
    const args = platform === "win32"
      ? ["/d", "/s", "/c", step.command, ...step.args]
      : step.args;
    const result = spawnSync(executable, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    if (result.error) {
      console.error(`${step.label} could not start: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      console.error(`${step.label} failed with exit code ${result.status}.`);
      return result.status ?? 1;
    }
  }

  console.log("\nScenario change verification passed.");
  return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runVerification();
}
