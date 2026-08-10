const PROGRESS_KEY = "perxona-scenario-training-progress-v1";
const ENABLED_KEY = "perxona-scenario-training-progress-enabled";

export function isProgressStorageEnabled(storage = globalThis.localStorage) {
  return safely(() => storage.getItem(ENABLED_KEY) === "true", false);
}

export function setProgressStorageEnabled(
  enabled,
  storage = globalThis.localStorage,
) {
  return safely(() => {
    if (enabled) storage.setItem(ENABLED_KEY, "true");
    else storage.removeItem(ENABLED_KEY);
    return true;
  }, false);
}

export function loadProgress(storage = globalThis.localStorage) {
  return safely(() => {
    const parsed = JSON.parse(storage.getItem(PROGRESS_KEY) ?? "null");
    if (parsed?.version !== 1 || !isScenarioCounts(parsed.scenarios)) {
      return emptyProgress();
    }
    return parsed;
  }, emptyProgress());
}

export function recordScenarioCompletion(
  scenarioId,
  storage = globalThis.localStorage,
) {
  if (!isProgressStorageEnabled(storage)) return loadProgress(storage);
  if (typeof scenarioId !== "string" || !scenarioId.trim()) {
    throw new TypeError("scenarioId is required.");
  }

  const progress = loadProgress(storage);
  progress.scenarios[scenarioId] =
    (progress.scenarios[scenarioId] ?? 0) + 1;
  return safely(() => {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  }, loadProgress(storage));
}

export function clearProgress(storage = globalThis.localStorage) {
  return safely(() => {
    storage.removeItem(PROGRESS_KEY);
    return true;
  }, false);
}

export function exportProgress(storage = globalThis.localStorage) {
  return JSON.stringify(loadProgress(storage), null, 2);
}

export function importProgress(text, storage = globalThis.localStorage) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("Progress file is not valid JSON.");
  }
  if (parsed?.version !== 1 || !isScenarioCounts(parsed.scenarios)) {
    throw new TypeError("Progress file has an unsupported format.");
  }
  const normalized = { version: 1, scenarios: { ...parsed.scenarios } };
  const saved = safely(() => {
    storage.setItem(PROGRESS_KEY, JSON.stringify(normalized));
    return true;
  }, false);
  if (!saved) throw new Error("Progress could not be saved.");
  return normalized;
}

export function filterScenariosByCompletion(
  scenarios,
  progress,
  filter = "all",
) {
  if (filter === "incomplete") {
    return scenarios.filter((scenario) => !progress.scenarios[scenario.id]);
  }
  if (filter === "completed") {
    return scenarios.filter((scenario) => progress.scenarios[scenario.id] > 0);
  }
  return scenarios;
}

function emptyProgress() {
  return { version: 1, scenarios: {} };
}

function isScenarioCounts(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, count]) =>
        id.trim() && Number.isSafeInteger(count) && count >= 0,
    )
  );
}

function safely(operation, fallback) {
  try {
    return operation();
  } catch {
    return fallback;
  }
}
