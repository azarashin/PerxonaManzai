export function validateScenarioCatalog(catalog) {
  if (!Array.isArray(catalog?.categories) || !Array.isArray(catalog?.scenarios)) {
    throw new Error("Scenario catalog must contain categories and scenarios arrays.");
  }

  const categoryIds = collectUniqueIds(catalog.categories, "category");
  collectUniqueIds(catalog.scenarios, "scenario");

  for (const category of catalog.categories) {
    if (!isLocalizedText(category.title)) {
      throw new Error(`Category ${category.id} requires ja, en, and zh titles.`);
    }
  }

  for (const scenario of catalog.scenarios) {
    if (!categoryIds.has(scenario.categoryId)) {
      throw new Error(
        `Scenario ${scenario.id} references unknown category ${scenario.categoryId}.`,
      );
    }
    if (typeof scenario.path !== "string" || !scenario.path.trim()) {
      throw new Error(`Scenario ${scenario.id} requires a path.`);
    }
    if (!Number.isSafeInteger(scenario.beatCount) || scenario.beatCount < 1) {
      throw new Error(`Scenario ${scenario.id} requires a positive beatCount.`);
    }
    if (!["beginner", "intermediate", "advanced"].includes(scenario.difficulty)) {
      throw new Error(`Scenario ${scenario.id} has an invalid difficulty.`);
    }
    if (
      !Number.isSafeInteger(scenario.estimatedMinutes) ||
      scenario.estimatedMinutes < 1
    ) {
      throw new Error(`Scenario ${scenario.id} requires positive estimatedMinutes.`);
    }
    if (!isLocalizedStringList(scenario.learningObjectives)) {
      throw new Error(`Scenario ${scenario.id} requires localized learningObjectives.`);
    }
    if (!isLocalizedText(scenario.title)) {
      throw new Error(`Scenario ${scenario.id} requires ja, en, and zh titles.`);
    }
  }

  return catalog;
}

export function scenariosForCategory(catalog, categoryId) {
  return catalog.scenarios
    .filter((scenario) => scenario.categoryId === categoryId)
    .sort((left, right) => left.beatCount - right.beatCount);
}

function collectUniqueIds(items, itemType) {
  const ids = new Set();
  for (const item of items) {
    if (typeof item?.id !== "string" || !item.id.trim()) {
      throw new Error(`Every ${itemType} requires an id.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`Duplicate ${itemType} id: ${item.id}.`);
    }
    ids.add(item.id);
  }
  return ids;
}

function isLocalizedText(value) {
  return ["ja", "en", "zh"].every(
    (language) => typeof value?.[language] === "string" && value[language].trim(),
  );
}

function isLocalizedStringList(value) {
  return ["ja", "en", "zh"].every(
    (language) =>
      Array.isArray(value?.[language]) &&
      value[language].length > 0 &&
      value[language].every(
        (item) => typeof item === "string" && item.trim(),
      ),
  );
}
