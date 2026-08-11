import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrderedScenario,
  createReviewScenario,
} from "../public/demos/manzai-training/training-options.js";

const scenario = {
  id: "sample",
  beats: [{ id: "first" }, { id: "second" }, { id: "third" }],
};

test("random order shuffles a copy without changing the source", () => {
  const shuffled = createOrderedScenario(scenario, "random", () => 0);
  assert.deepEqual(shuffled.beats.map(({ id }) => id), ["second", "third", "first"]);
  assert.deepEqual(scenario.beats.map(({ id }) => id), ["first", "second", "third"]);
});

test("random order preserves branching scenario beat order", () => {
  const branching = {
    ...scenario,
    stateVariables: [{ id: "trust" }],
  };
  const ordered = createOrderedScenario(branching, "random", () => 0);
  assert.deepEqual(ordered.beats.map(({ id }) => id), ["first", "second", "third"]);
});

test("review selects scores below the threshold", () => {
  const review = createReviewScenario(scenario, [
    { beat: scenario.beats[0], result: { totalScore: 90 } },
    { beat: scenario.beats[1], result: { totalScore: 65 } },
    { beat: scenario.beats[2], result: { totalScore: 40 } },
  ]);
  assert.deepEqual(review.beats.map(({ id }) => id), ["second", "third"]);
});

test("review falls back to the lowest score", () => {
  const review = createReviewScenario(scenario, [
    { beat: scenario.beats[0], result: { totalScore: 95 } },
    { beat: scenario.beats[1], result: { totalScore: 85 } },
  ]);
  assert.deepEqual(review.beats.map(({ id }) => id), ["second"]);
});
