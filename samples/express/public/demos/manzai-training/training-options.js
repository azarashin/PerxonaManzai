export function createOrderedScenario(scenario, order = "normal", random = Math.random) {
  const beats = [...scenario.beats];
  if (order === "random" && !isBranchingScenario(scenario)) {
    for (let index = beats.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [beats[index], beats[target]] = [beats[target], beats[index]];
    }
  }
  return { ...scenario, beats };
}

export function randomizeChoiceOrder(scenario, random = Math.random) {
  return {
    ...scenario,
    beats: scenario.beats.map((beat) => ({
      ...beat,
      choices: shuffleCopy(beat.choices, random),
    })),
  };
}

export function createReviewScenario(scenario, resultDetails, threshold = 80) {
  let beatIds = resultDetails
    .filter(({ result }) => result.totalScore < threshold)
    .map(({ beat }) => beat.id);

  if (beatIds.length === 0 && resultDetails.length > 0) {
    const lowest = [...resultDetails].sort(
      (left, right) => left.result.totalScore - right.result.totalScore,
    )[0];
    beatIds = [lowest.beat.id];
  }

  const selectedIds = new Set(beatIds);
  return {
    ...scenario,
    startBeatId: undefined,
    stateVariables: undefined,
    beats: scenario.beats
      .filter((beat) => selectedIds.has(beat.id))
      .map((beat) => ({
        ...beat,
        ...(beat.choices
          ? { choices: beat.choices.map(({ stateEffects, routes, ...choice }) => choice) }
          : {}),
      })),
  };
}

export function isBranchingScenario(scenario) {
  return Boolean(
    scenario.startBeatId ||
    scenario.stateVariables?.length ||
    scenario.beats.some((beat) =>
      beat.choices?.some((choice) => choice.stateEffects?.length || choice.routes?.length),
    ),
  );
}

function shuffleCopy(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}
