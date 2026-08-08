export class ScenarioController {
  constructor(scenario) {
    validateScenario(scenario);
    this.scenario = scenario;
    this.currentIndex = -1;
    this.results = [];
  }

  start() {
    this.currentIndex = 0;
    this.results = [];
    return this.currentBeat;
  }

  get currentBeat() {
    return this.scenario.beats[this.currentIndex] ?? null;
  }

  get progress() {
    return {
      current: this.currentIndex + 1,
      total: this.scenario.beats.length,
    };
  }

  recordResult(result) {
    this.results[this.currentIndex] = result;
  }

  advance() {
    this.currentIndex += 1;
    return this.currentBeat;
  }

  get isComplete() {
    return this.currentIndex >= this.scenario.beats.length;
  }

  get resultDetails() {
    return this.results.flatMap((result, index) =>
      result
        ? [
            {
              beatNumber: index + 1,
              beat: this.scenario.beats[index],
              result,
            },
          ]
        : [],
    );
  }

  get summary() {
    const totalScore = this.results.reduce(
      (sum, result) => sum + result.totalScore,
      0,
    );
    const averageReactionSeconds = this.results.length
      ? this.results.reduce(
          (sum, result) => sum + result.reactionSeconds,
          0,
        ) / this.results.length
      : 0;

    return {
      totalScore,
      maximumScore: this.scenario.beats.length * 100,
      averageReactionSeconds,
      completedBeats: this.results.length,
    };
  }
}

function validateScenario(scenario) {
  if (!isLocalizedText(scenario?.title) || !Array.isArray(scenario.beats)) {
    throw new Error("シナリオの形式が正しくありません。");
  }
  if (scenario.beats.length === 0) {
    throw new Error("シナリオにボケを1件以上登録してください。");
  }

  for (const [index, beat] of scenario.beats.entries()) {
    if (
      !beat.id ||
      !isLocalizedText(beat.boke) ||
      !isReaction(beat.reaction) ||
      !Array.isArray(beat.choices)
    ) {
      throw new Error(`シナリオ ${index + 1} 件目の形式が正しくありません。`);
    }
    if (beat.choices.length < 2) {
      throw new Error(`シナリオ ${index + 1} 件目には選択肢が2件以上必要です。`);
    }
    if (beat.choices.some((choice) => !isLocalizedText(choice.text))) {
      throw new Error(
        `シナリオ ${index + 1} 件目の選択肢に日英中の表示文が必要です。`,
      );
    }
  }
}

function isReaction(value) {
  return (
    value &&
    isLocalizedText(value.description) &&
    Array.isArray(value.motionTags) &&
    value.motionTags.length > 0 &&
    value.motionTags.every((tag) => typeof tag === "string" && tag.trim()) &&
    (value.motionId === undefined ||
      (typeof value.motionId === "string" && value.motionId.trim())) &&
    (value.variant === undefined ||
      (Number.isInteger(value.variant) && value.variant >= 0)) &&
    (value.priority === undefined ||
      (Number.isInteger(value.priority) && value.priority >= 0)) &&
    (value.cue === undefined || ["start", "end"].includes(value.cue))
  );
}

function isLocalizedText(value) {
  if (typeof value === "string") return value.trim().length > 0;
  return ["ja", "en", "zh"].every(
    (language) => typeof value?.[language] === "string" && value[language].trim(),
  );
}
