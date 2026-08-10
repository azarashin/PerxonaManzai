export function resolveScenarioRoute(catalog, search = "") {
  const parameters = new URLSearchParams(search);
  const requestedCategoryId = parameters.get("category");
  const requestedScenarioId = parameters.get("scenario");
  const requestedScenario = catalog.scenarios.find(
    (scenario) => scenario.id === requestedScenarioId,
  );
  const requestedCategory = catalog.categories.find(
    (category) => category.id === requestedCategoryId,
  );

  const categoryId =
    requestedScenario?.categoryId ??
    requestedCategory?.id ??
    catalog.categories[0]?.id ??
    "";
  const scenarioId =
    requestedScenario?.categoryId === categoryId
      ? requestedScenario.id
      : catalog.scenarios.find((scenario) => scenario.categoryId === categoryId)
          ?.id ?? "";

  return {
    categoryId,
    scenarioId,
    usedFallback:
      (requestedCategoryId !== null && !requestedCategory) ||
      (requestedScenarioId !== null && !requestedScenario),
  };
}

export function updateScenarioSearch(search, categoryId, scenarioId) {
  const parameters = new URLSearchParams(search);
  if (categoryId) parameters.set("category", categoryId);
  else parameters.delete("category");
  if (scenarioId) parameters.set("scenario", scenarioId);
  else parameters.delete("scenario");
  const serialized = parameters.toString();
  return serialized ? `?${serialized}` : "";
}
