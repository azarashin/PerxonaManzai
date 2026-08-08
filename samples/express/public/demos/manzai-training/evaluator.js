const MINIMUM_MATCH_SCORE = 0.48;

export function evaluateResponse(
  beat,
  transcript,
  reactionSeconds,
  language = "ja",
) {
  const matches = beat.choices.map((choice) => {
    const phrases = [
      localizedText(choice.text, language),
      ...localizedAliases(choice.aliases, language),
    ];
    const similarity = Math.max(
      ...phrases.map((phrase) => phraseSimilarity(transcript, phrase, language)),
    );
    return { choice, similarity };
  });
  matches.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = matches[0];
  if (!bestMatch || bestMatch.similarity < MINIMUM_MATCH_SCORE) {
    return {
      matched: false,
      transcript,
      similarity: bestMatch?.similarity ?? 0,
      feedback:
        "表示された選択肢のどれかを、もう一度はっきり発声してください。",
    };
  }

  const contentScore = Math.max(
    0,
    Math.min(80, Number(bestMatch.choice.contentPoints) || 0),
  );
  const timingScore = scoreTiming(reactionSeconds);

  return {
    matched: true,
    transcript,
    choiceId: bestMatch.choice.id,
    choiceText: localizedText(bestMatch.choice.text, language),
    similarity: bestMatch.similarity,
    contentScore,
    timingScore,
    totalScore: contentScore + timingScore,
    reactionSeconds,
    feedback: bestMatch.choice.feedback,
  };
}

function localizedAliases(aliases, language) {
  if (Array.isArray(aliases)) return language === "ja" ? aliases : [];
  return Array.isArray(aliases?.[language]) ? aliases[language] : [];
}

function localizedText(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] ?? "";
}

export function normalizeSpeechText(value, language = "ja") {
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase({ en: "en-US", zh: "zh-TW", ja: "ja-JP" }[language])
    .replace(/[\s\p{P}\p{S}]/gu, "");

  return language === "ja"
    ? normalized.replace(/[ァ-ヶ]/g, (character) =>
        String.fromCharCode(character.charCodeAt(0) - 0x60),
      )
    : normalized;
}

export function normalizeJapanese(value) {
  return normalizeSpeechText(value, "ja");
}

function phraseSimilarity(left, right, language) {
  const normalizedLeft = normalizeSpeechText(left, language);
  const normalizedRight = normalizeSpeechText(right, language);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    const lengthRatio =
      Math.min(normalizedLeft.length, normalizedRight.length) /
      Math.max(normalizedLeft.length, normalizedRight.length);
    return Math.max(0.9, lengthRatio);
  }

  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  return 1 - distance / Math.max(normalizedLeft.length, normalizedRight.length);
}

function levenshteinDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function scoreTiming(seconds) {
  if (seconds <= 1) return 20;
  if (seconds <= 2) return 18;
  if (seconds <= 3) return 15;
  if (seconds <= 4.5) return 10;
  if (seconds <= 6) return 6;
  return 2;
}
