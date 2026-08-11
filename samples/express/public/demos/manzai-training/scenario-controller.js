export class ScenarioController {
  constructor(scenario) {
    validateScenario(scenario);
    this.scenario = scenario;
    this.beatsById = new Map(scenario.beats.map((beat) => [beat.id, beat]));
    this.currentBeatId = null;
    this.nextBeatId = null;
    this.state = createInitialState(scenario.stateVariables);
    this.results = [];
  }

  start() {
    this.currentBeatId = this.scenario.startBeatId ?? this.scenario.beats[0].id;
    this.nextBeatId = null;
    this.state = createInitialState(this.scenario.stateVariables);
    this.results = [];
    return this.currentBeat;
  }

  get currentBeat() {
    return this.beatsById.get(this.currentBeatId) ?? null;
  }

  get progress() {
    return {
      current: this.results.length + (this.currentBeat ? 1 : 0),
      total: this.scenario.beats.length,
    };
  }

  recordResult(result) {
    const beat = this.currentBeat;
    if (!beat) throw new Error("Cannot record a result without an active beat.");
    const choice = beat.choices.find(({ id }) => id === result.choiceId);
    if (!choice) throw new Error(`Choice ${result.choiceId} does not belong to beat ${beat.id}.`);

    applyStateEffects(this.state, choice.stateEffects, this.scenario.stateVariables);
    this.nextBeatId = resolveNextBeatId(choice.routes, this.state);
    if (choice.routes === undefined) {
      const currentIndex = this.scenario.beats.findIndex(({ id }) => id === beat.id);
      this.nextBeatId = this.scenario.beats[currentIndex + 1]?.id ?? null;
    }
    this.results.push({ beat, result, state: { ...this.state } });
  }

  advance() {
    this.currentBeatId = this.nextBeatId;
    this.nextBeatId = null;
    return this.currentBeat;
  }

  get hasNext() {
    return this.nextBeatId !== null;
  }

  get isComplete() {
    return this.currentBeat === null;
  }

  get resultDetails() {
    return this.results.map(({ beat, result, state }, index) => ({
      beatNumber: index + 1,
      beat,
      result,
      state,
    }));
  }

  get summary() {
    const scoreSum = this.results.reduce(
      (sum, entry) => sum + entry.result.totalScore,
      0,
    );
    const totalScore = this.results.length
      ? Math.round(scoreSum / this.results.length)
      : 0;
    const averageReactionSeconds = this.results.length
      ? this.results.reduce(
          (sum, entry) => sum + entry.result.reactionSeconds,
          0,
        ) / this.results.length
      : 0;

    return {
      totalScore,
      maximumScore: 100,
      averageReactionSeconds,
      completedBeats: this.results.length,
    };
  }
}

function validateScenario(scenario) {
  if (
    !isLocalizedText(scenario?.title) ||
    !Array.isArray(scenario.evaluationAxes) ||
    !Array.isArray(scenario.beats)
  ) {
    throw new Error("シナリオの形式が正しくありません。");
  }
  if (scenario.beats.length === 0) {
    throw new Error("シナリオにボケを1件以上登録してください。");
  }
  const axes = new Map(scenario.evaluationAxes.map((axis) => [axis.id, axis]));
  if (
    axes.size !== scenario.evaluationAxes.length ||
    scenario.evaluationAxes.some(
      (axis) =>
        !axis.id ||
        !isLocalizedText(axis.label) ||
        !isLocalizedText(axis.description) ||
        !Number.isInteger(axis.maxPoints) ||
        axis.maxPoints <= 0,
    ) ||
    scenario.evaluationAxes.reduce((sum, axis) => sum + axis.maxPoints, 0) !== 80
  ) {
    throw new Error("Evaluation axes must be unique, valid, and total 80 points.");
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
    if (
      beat.choices.some(
        (choice) =>
          !isLocalizedText(choice.text) ||
          !isLocalizedText(choice.feedback) ||
          !hasValidAxisScores(choice.axisScores, axes),
      )
    ) {
      throw new Error(
        `シナリオ ${index + 1} 件目の選択肢に日英中の表示文と講評が必要です。`,
      );
    }
  }
}

function createInitialState(variables = []) {
  return Object.fromEntries(variables.map(({ id, initialValue }) => [id, initialValue]));
}

function applyStateEffects(state, effects = [], variables = []) {
  const variablesById = new Map(variables.map((variable) => [variable.id, variable]));
  for (const effect of effects) {
    const variable = variablesById.get(effect.stateId);
    const nextValue = effect.operation === "add"
      ? state[effect.stateId] + effect.value
      : effect.value;
    state[effect.stateId] = variable?.type === "number"
      ? Math.max(variable.minimum ?? -Infinity, Math.min(variable.maximum ?? Infinity, nextValue))
      : nextValue;
  }
}

function resolveNextBeatId(routes, state) {
  if (routes === undefined) return undefined;
  return routes.find((route) =>
    route.conditions === undefined || route.conditions.every((condition) => matchesCondition(condition, state)),
  )?.nextBeatId ?? null;
}

function matchesCondition({ stateId, operator, value }, state) {
  const actual = state[stateId];
  const comparisons = {
    equals: () => actual === value,
    "not-equals": () => actual !== value,
    "greater-than": () => actual > value,
    "greater-than-or-equal": () => actual >= value,
    "less-than": () => actual < value,
    "less-than-or-equal": () => actual <= value,
  };
  return comparisons[operator]?.() ?? false;
}

function hasValidAxisScores(axisScores, axes) {
  if (!axisScores || Object.keys(axisScores).length !== axes.size) return false;
  return [...axes].every(
    ([axisId, axis]) =>
      Number.isInteger(axisScores[axisId]) &&
      axisScores[axisId] >= 0 &&
      axisScores[axisId] <= axis.maxPoints,
  );
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
