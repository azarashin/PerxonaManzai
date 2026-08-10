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
