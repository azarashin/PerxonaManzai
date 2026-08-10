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
