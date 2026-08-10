export function createOrderedScenario(scenario, order = "normal", random = Math.random) {
  const beats = [...scenario.beats];
  if (order === "random") {
    for (let index = beats.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [beats[index], beats[target]] = [beats[target], beats[index]];
    }
  }
  return { ...scenario, beats };
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
    beats: scenario.beats.filter((beat) => selectedIds.has(beat.id)),
  };
}
