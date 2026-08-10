export function analyzeScenarioQuality(scenario) {
  const warnings = [];

  for (const beat of scenario.beats) {
    const scores = beat.choices.map((choice) => choice.contentPoints);
    if (new Set(scores).size === 1) {
      warnings.push(`${beat.id}: all choices have the same contentPoints`);
    }

    for (const language of ["ja", "en", "zh"]) {
      const owners = new Map();
      for (const choice of beat.choices) {
        const phrases = [
          choice.text[language],
          ...aliasesForLanguage(choice.aliases, language),
        ];
        for (const phrase of phrases) {
          if (phrase.length > 120) {
            warnings.push(`${beat.id}/${choice.id}/${language}: response is longer than 120 characters`);
          }
          const normalized = normalize(phrase);
          const previousOwner = owners.get(normalized);
          if (previousOwner && previousOwner !== choice.id) {
            warnings.push(
              `${beat.id}/${language}: phrase is shared by ${previousOwner} and ${choice.id}`,
            );
          } else {
            owners.set(normalized, choice.id);
          }
        }
      }
    }
  }

  if (
    scenario.beats.length > 1 &&
    new Set(
      scenario.beats.map((beat) => beat.reaction.motionTags.join("|")),
    ).size === 1
  ) {
    warnings.push("all beats use the same motionTags");
  }

  return warnings;
}

function aliasesForLanguage(aliases, language) {
  if (Array.isArray(aliases)) return language === "ja" ? aliases : [];
  return aliases?.[language] ?? [];
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}
