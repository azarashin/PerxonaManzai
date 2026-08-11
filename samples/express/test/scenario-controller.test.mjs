import assert from "node:assert/strict";
import test from "node:test";

import { ScenarioController } from "../public/demos/manzai-training/scenario-controller.js";

const localized = (text) => ({ ja: text, en: text, zh: text });
const axis = {
  id: "clarity",
  label: localized("Clarity"),
  description: localized("Be clear"),
  maxPoints: 80,
};

function choice(id, additions = {}) {
  return {
    id,
    text: localized(id),
    axisScores: { clarity: 80 },
    feedback: localized("feedback"),
    ...additions,
  };
}

function beat(id, choices) {
  return {
    id,
    boke: localized(id),
    reaction: { description: localized("reaction"), motionTags: ["category:talking"] },
    choices,
  };
}

test("state effects are clamped before conditional routes are evaluated", () => {
  const scenario = {
    id: "branching",
    title: localized("Branching"),
    evaluationAxes: [axis],
    startBeatId: "opening",
    stateVariables: [{
      id: "trust",
      label: localized("Trust"),
      description: localized("Trust level"),
      type: "number",
      initialValue: 1,
      minimum: 0,
      maximum: 2,
    }],
    beats: [
      beat("opening", [
        choice("empathetic", {
          stateEffects: [{ stateId: "trust", operation: "add", value: 5 }],
          routes: [
            {
              conditions: [{ stateId: "trust", operator: "greater-than-or-equal", value: 2 }],
              nextBeatId: "resolution",
            },
            { nextBeatId: "escalation" },
          ],
        }),
        choice("neutral", { routes: [{ nextBeatId: "escalation" }] }),
      ]),
      beat("resolution", [choice("finish-well", { routes: [{ nextBeatId: null }] }), choice("finish-ok")]),
      beat("escalation", [choice("recover"), choice("withdraw")]),
    ],
  };

  const controller = new ScenarioController(scenario);
  assert.equal(controller.start().id, "opening");
  controller.recordResult({ choiceId: "empathetic", totalScore: 100, reactionSeconds: 1 });
  assert.equal(controller.state.trust, 2);
  assert.equal(controller.hasNext, true);
  assert.equal(controller.advance().id, "resolution");
  controller.recordResult({ choiceId: "finish-well", totalScore: 90, reactionSeconds: 2 });
  assert.equal(controller.hasNext, false);
  controller.advance();
  assert.equal(controller.isComplete, true);
  assert.deepEqual(controller.resultDetails.map(({ beat }) => beat.id), ["opening", "resolution"]);
  assert.equal(controller.summary.maximumScore, 200);
});

test("a scenario without routes advances in array order", () => {
  const scenario = {
    id: "linear",
    title: localized("Linear"),
    evaluationAxes: [axis],
    beats: [beat("first", [choice("one"), choice("two")]), beat("second", [choice("three"), choice("four")])],
  };
  const controller = new ScenarioController(scenario);
  controller.start();
  controller.recordResult({ choiceId: "one", totalScore: 80, reactionSeconds: 1 });
  assert.equal(controller.advance().id, "second");
});
