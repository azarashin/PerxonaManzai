const RULE_IDS = [
  "CHOICE_DUPLICATE_WITHIN_SCENARIO",
  "CHOICE_REUSED_WITHIN_CATEGORY",
  "CHOICE_OVERUSED_ACROSS_CATALOG",
  "DIALOGUE_OVERUSED_ACROSS_CATALOG",
  "FEEDBACK_OVERUSED_ACROSS_CATALOG",
  "SCORES_NOT_DIFFERENTIATED",
  "SPEECH_CHOICE_TOO_LONG",
  "MOTION_TAGS_NOT_VARIED",
];

const COUNT_RULE_IDS = new Set([
  "CHOICE_OVERUSED_ACROSS_CATALOG",
  "DIALOGUE_OVERUSED_ACROSS_CATALOG",
  "FEEDBACK_OVERUSED_ACROSS_CATALOG",
]);

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGES = ["ja", "en", "zh"];

export function validateScenarioQualityPolicy(policy) {
  assertObject(policy, "quality policy");
  assertOnlyKeys(
    policy,
    ["$schema", "version", "mode", "languages", "normalization", "rules", "exceptions"],
    "quality policy",
  );
  if (policy.$schema !== "../schemas/scenario-quality-policy.schema.json") {
    throw new Error("quality policy: unexpected $schema");
  }
  if (policy.version !== 1) throw new Error("quality policy: version must be 1");
  if (!["audit", "enforce"].includes(policy.mode)) {
    throw new Error("quality policy: mode must be audit or enforce");
  }
  if (
    !Array.isArray(policy.languages) ||
    policy.languages.length !== LANGUAGES.length ||
    !LANGUAGES.every((language) => policy.languages.includes(language))
  ) {
    throw new Error("quality policy: languages must contain ja, en, and zh once each");
  }

  assertObject(policy.normalization, "quality policy normalization");
  assertOnlyKeys(
    policy.normalization,
    ["unicodeForm", "lowercase", "stripWhitespace", "stripPunctuationAndSymbols"],
    "quality policy normalization",
  );
  if (!["NFC", "NFD", "NFKC", "NFKD"].includes(policy.normalization.unicodeForm)) {
    throw new Error("quality policy: unsupported Unicode normalization form");
  }
  for (const key of ["lowercase", "stripWhitespace", "stripPunctuationAndSymbols"]) {
    if (typeof policy.normalization[key] !== "boolean") {
      throw new Error(`quality policy normalization: ${key} must be boolean`);
    }
  }

  assertObject(policy.rules, "quality policy rules");
  assertOnlyKeys(policy.rules, RULE_IDS, "quality policy rules");
  for (const ruleId of RULE_IDS) {
    const rule = policy.rules[ruleId];
    assertObject(rule, `quality policy rule ${ruleId}`);
    const additionalKey = COUNT_RULE_IDS.has(ruleId)
      ? "maxOccurrences"
      : ruleId === "SPEECH_CHOICE_TOO_LONG"
        ? "maxCharacters"
        : undefined;
    assertOnlyKeys(
      rule,
      ["enabled", "severity", additionalKey].filter(Boolean),
      `quality policy rule ${ruleId}`,
    );
    if (typeof rule.enabled !== "boolean") {
      throw new Error(`quality policy rule ${ruleId}: enabled must be boolean`);
    }
    if (!["error", "warning"].includes(rule.severity)) {
      throw new Error(`quality policy rule ${ruleId}: invalid severity`);
    }
    if (additionalKey && (!Number.isSafeInteger(rule[additionalKey]) || rule[additionalKey] < 1)) {
      throw new Error(`quality policy rule ${ruleId}: ${additionalKey} must be a positive integer`);
    }
  }

  if (!Array.isArray(policy.exceptions)) {
    throw new Error("quality policy: exceptions must be an array");
  }
  for (const [index, exception] of policy.exceptions.entries()) {
    validateException(exception, index, policy.languages);
  }
  return policy;
}

export function analyzeScenarioQuality(scenario, policy, context = {}) {
  const diagnostics = [];
  const phraseOccurrences = new Map();

  for (const beat of scenario.beats) {
    const scores = beat.choices.map(totalScore);
    if (new Set(scores).size === 1) {
      addDiagnostic(diagnostics, policy, "SCORES_NOT_DIFFERENTIATED", {
        ...context,
        scenarioId: scenario.id ?? context.scenarioId,
        beatId: beat.id,
        message: "all choices have the same total axis score",
      });
    }

    for (const language of policy.languages) {
      for (const choice of beat.choices) {
        const phrases = [
          { value: choice.text[language], source: "text" },
          ...aliasesForLanguage(choice.aliases, language).map((value) => ({ value, source: "alias" })),
        ];
        for (const phrase of phrases) {
          const location = {
            ...context,
            scenarioId: scenario.id ?? context.scenarioId,
            beatId: beat.id,
            choiceId: choice.id,
            language,
          };
          const characterCount = Array.from(phrase.value).length;
          if (characterCount > policy.rules.SPEECH_CHOICE_TOO_LONG.maxCharacters) {
            addDiagnostic(diagnostics, policy, "SPEECH_CHOICE_TOO_LONG", {
              ...location,
              message: `${phrase.source} is ${characterCount} characters; maximum is ${policy.rules.SPEECH_CHOICE_TOO_LONG.maxCharacters}`,
            });
          }

          const normalizedText = normalizeQualityText(phrase.value, policy.normalization);
          if (!normalizedText) continue;
          const ownerKey = `${language}\u0000${normalizedText}`;
          const occurrences = phraseOccurrences.get(ownerKey) ?? [];
          occurrences.push({ ...location, normalizedText, owner: `${beat.id}/${choice.id}` });
          phraseOccurrences.set(ownerKey, occurrences);
        }
      }
    }
  }

  for (const occurrences of phraseOccurrences.values()) {
    const included = withoutExceptions("CHOICE_DUPLICATE_WITHIN_SCENARIO", occurrences, policy);
    const owners = [...new Set(included.map(({ owner }) => owner))];
    if (owners.length < 2) continue;
    const first = included[0];
    addDiagnostic(diagnostics, policy, "CHOICE_DUPLICATE_WITHIN_SCENARIO", {
      ...context,
      scenarioId: scenario.id ?? context.scenarioId,
      language: first.language,
      normalizedText: first.normalizedText,
      message: `phrase is shared by ${owners.join(", ")}`,
    }, false);
  }

  if (
    scenario.beats.length > 1 &&
    new Set(scenario.beats.map((beat) => beat.reaction.motionTags.join("|"))).size === 1
  ) {
    addDiagnostic(diagnostics, policy, "MOTION_TAGS_NOT_VARIED", {
      ...context,
      scenarioId: scenario.id ?? context.scenarioId,
      message: "all beats use the same motionTags",
    });
  }

  return diagnostics;
}

export function analyzeScenarioCatalogQuality(catalog, scenariosById, policy) {
  validateScenarioQualityPolicy(policy);
  const diagnostics = [];
  const preferredChoices = new Map();
  const choices = new Map();
  const dialogue = new Map();
  const feedback = new Map();

  for (const entry of catalog.scenarios) {
    const scenario = scenariosById.get(entry.id);
    if (!scenario) throw new Error(`Missing scenario data for ${entry.id}`);
    const context = { categoryId: entry.categoryId, scenarioId: entry.id };
    diagnostics.push(...analyzeScenarioQuality(scenario, policy, context));

    for (const beat of scenario.beats) {
      for (const language of policy.languages) {
        collectOccurrence(dialogue, beat.boke[language], policy, {
          ...context,
          beatId: beat.id,
          language,
        });
      }

      const maximumScore = Math.max(...beat.choices.map(totalScore));
      for (const choice of beat.choices) {
        for (const language of policy.languages) {
          const occurrence = {
            ...context,
            beatId: beat.id,
            choiceId: choice.id,
            language,
          };
          collectOccurrence(choices, choice.text[language], policy, occurrence);
          collectOccurrence(feedback, choice.feedback[language], policy, occurrence);
          if (totalScore(choice) === maximumScore) {
            collectOccurrence(preferredChoices, choice.text[language], policy, occurrence, entry.categoryId);
          }
        }
      }
    }
  }

  reportPreferredChoiceReuse(diagnostics, preferredChoices, policy);
  reportCountLimit(diagnostics, choices, policy, "CHOICE_OVERUSED_ACROSS_CATALOG", "choice");
  reportCountLimit(diagnostics, dialogue, policy, "DIALOGUE_OVERUSED_ACROSS_CATALOG", "dialogue");
  reportCountLimit(diagnostics, feedback, policy, "FEEDBACK_OVERUSED_ACROSS_CATALOG", "feedback");
  return diagnostics;
}

export function normalizeQualityText(value, normalization) {
  let normalized = value.normalize(normalization.unicodeForm);
  if (normalization.lowercase) normalized = normalized.toLowerCase();
  if (normalization.stripWhitespace) normalized = normalized.replace(/\s/gu, "");
  if (normalization.stripPunctuationAndSymbols) normalized = normalized.replace(/[\p{P}\p{S}]/gu, "");
  return normalized;
}

function reportPreferredChoiceReuse(diagnostics, groups, policy) {
  for (const occurrences of groups.values()) {
    const included = withoutExceptions("CHOICE_REUSED_WITHIN_CATEGORY", occurrences, policy);
    const scenarioIds = new Set(included.map((occurrence) => occurrence.scenarioId));
    if (scenarioIds.size < 2) continue;
    const first = included[0];
    addDiagnostic(diagnostics, policy, "CHOICE_REUSED_WITHIN_CATEGORY", {
      categoryId: first.categoryId,
      language: first.language,
      normalizedText: first.normalizedText,
      message: `preferred choice is reused in ${formatLocations(included)}`,
    }, false);
  }
}

function reportCountLimit(diagnostics, groups, policy, ruleId, label) {
  const limit = policy.rules[ruleId].maxOccurrences;
  for (const occurrences of groups.values()) {
    const included = withoutExceptions(ruleId, occurrences, policy);
    if (included.length <= limit) continue;
    const first = included[0];
    addDiagnostic(diagnostics, policy, ruleId, {
      language: first.language,
      normalizedText: first.normalizedText,
      message: `${label} occurs ${included.length} times (maximum ${limit}): ${formatLocations(included)}`,
    }, false);
  }
}

function collectOccurrence(groups, value, policy, location, categoryKey = "") {
  const normalizedText = normalizeQualityText(value, policy.normalization);
  if (!normalizedText) return;
  const key = `${categoryKey}\u0000${location.language}\u0000${normalizedText}`;
  const occurrence = { ...location, normalizedText };
  const existing = groups.get(key) ?? [];
  existing.push(occurrence);
  groups.set(key, existing);
}

function withoutExceptions(ruleId, occurrences, policy) {
  return occurrences.filter((occurrence) =>
    !policy.exceptions.some((exception) =>
      exception.ruleId === ruleId && scopeMatches(exception.scope, occurrence),
    ),
  );
}

function addDiagnostic(diagnostics, policy, ruleId, details, applyException = true) {
  const rule = policy.rules[ruleId];
  if (!rule.enabled) return;
  const diagnostic = { ruleId, severity: rule.severity, ...details };
  if (
    applyException &&
    policy.exceptions.some((exception) =>
      exception.ruleId === ruleId && scopeMatches(exception.scope, diagnostic),
    )
  ) return;
  diagnostics.push(diagnostic);
}

function scopeMatches(scope, diagnostic) {
  return Object.entries(scope).every(([key, value]) => diagnostic[key] === value);
}

function formatLocations(occurrences) {
  const limit = 8;
  const locations = occurrences
    .slice(0, limit)
    .map((item) => `${item.scenarioId}/${item.beatId}${item.choiceId ? `/${item.choiceId}` : ""}`)
    .join(", ");
  return occurrences.length > limit
    ? `${locations}, and ${occurrences.length - limit} more`
    : locations;
}

function totalScore(choice) {
  return Object.values(choice.axisScores).reduce((total, score) => total + score, 0);
}

function aliasesForLanguage(aliases, language) {
  if (Array.isArray(aliases)) return language === "ja" ? aliases : [];
  return aliases?.[language] ?? [];
}

function validateException(exception, index, languages) {
  const label = `quality policy exception ${index}`;
  assertObject(exception, label);
  assertOnlyKeys(
    exception,
    ["ruleId", "scope", "reason", "owner", "reviewReference", "expiresOn"],
    label,
    ["ruleId", "scope", "reason"],
  );
  if (!RULE_IDS.includes(exception.ruleId)) throw new Error(`${label}: invalid ruleId`);
  if (typeof exception.reason !== "string" || exception.reason.length < 20) {
    throw new Error(`${label}: reason must contain at least 20 characters`);
  }
  assertObject(exception.scope, `${label} scope`);
  const scopeKeys = ["categoryId", "scenarioId", "beatId", "choiceId", "language", "normalizedText"];
  assertOnlyKeys(exception.scope, scopeKeys, `${label} scope`, []);
  if (Object.keys(exception.scope).length === 0) throw new Error(`${label}: scope must not be empty`);
  for (const key of ["categoryId", "scenarioId", "beatId", "choiceId"]) {
    if (exception.scope[key] !== undefined && !ID_PATTERN.test(exception.scope[key])) {
      throw new Error(`${label}: scope ${key} must be a kebab-case ID`);
    }
  }
  if (exception.scope.language !== undefined && !languages.includes(exception.scope.language)) {
    throw new Error(`${label}: scope language is not enabled`);
  }
  if (
    exception.scope.normalizedText !== undefined &&
    (typeof exception.scope.normalizedText !== "string" || exception.scope.normalizedText.length === 0)
  ) {
    throw new Error(`${label}: normalizedText must not be empty`);
  }
  for (const key of ["owner", "reviewReference", "expiresOn"]) {
    if (exception[key] !== undefined && (typeof exception[key] !== "string" || !exception[key].trim())) {
      throw new Error(`${label}: ${key} must not be empty`);
    }
  }
  if (exception.expiresOn !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(exception.expiresOn)) {
    throw new Error(`${label}: expiresOn must use YYYY-MM-DD`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertOnlyKeys(value, allowedKeys, label, requiredKeys = allowedKeys) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label}: unknown property ${key}`);
  }
  for (const key of requiredKeys) {
    if (!(key in value)) throw new Error(`${label}: missing property ${key}`);
  }
}
