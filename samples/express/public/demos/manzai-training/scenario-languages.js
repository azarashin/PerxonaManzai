const supportedLanguages = ["en", "zh", "ja"];

export function scenarioDisplayLanguages(
  speechLanguage,
  playerLanguage,
  showPlayerLanguage = true,
) {
  const requestedLanguages = showPlayerLanguage
    ? [speechLanguage, playerLanguage]
    : [speechLanguage];
  return [...new Set(requestedLanguages)].filter((language) =>
    supportedLanguages.includes(language),
  );
}

export function defaultPronunciationGuideVisibility(
  scenarioLanguage,
  playerLanguage,
) {
  return (
    supportedLanguages.includes(scenarioLanguage) &&
    supportedLanguages.includes(playerLanguage) &&
    scenarioLanguage !== playerLanguage
  );
}

export function pronunciationGuideText(
  pronunciationGuide,
  scenarioLanguage,
  visible,
) {
  if (!visible || !supportedLanguages.includes(scenarioLanguage)) return "";
  const guide = pronunciationGuide?.[scenarioLanguage];
  return typeof guide === "string" ? guide : "";
}
