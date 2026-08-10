const supportedLanguages = ["en", "zh", "ja"];

export function scenarioDisplayLanguages(speechLanguage, playerLanguage) {
  return [...new Set([speechLanguage, playerLanguage])].filter((language) =>
    supportedLanguages.includes(language),
  );
}
