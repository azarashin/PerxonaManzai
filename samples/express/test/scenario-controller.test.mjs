import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.equal(controller.summary.totalScore, 95);
  assert.equal(controller.summary.maximumScore, 100);
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

test("refusing the municipal refund ATM request ends the scenario", async () => {
  const url = new URL(
    "../public/demos/manzai-training/scenarios/municipal-refund-atm.json",
    import.meta.url,
  );
  const scenario = JSON.parse(await readFile(url, "utf8"));

  for (const refusalChoiceId of ["atm-direction-strong", "atm-direction-partial"]) {
    const controller = new ScenarioController(scenario);
    controller.start();
    play(controller, "refund-notice-weak");
    assert.equal(controller.currentBeat.id, "atm-direction");
    play(controller, refusalChoiceId);
    assert.equal(controller.isComplete, true);
  }

  const compliant = new ScenarioController(scenario);
  compliant.start();
  play(compliant, "refund-notice-weak");
  play(compliant, "atm-direction-weak");
  assert.equal(compliant.currentBeat.id, "screen-guidance");
});

test("the enterprise renewal scenario reaches outcomes from accumulated state", async () => {
  const url = new URL(
    "../public/demos/manzai-training/scenarios/enterprise-renewal-negotiation.json",
    import.meta.url,
  );
  const scenario = JSON.parse(await readFile(url, "utf8"));

  const trusted = new ScenarioController(scenario);
  trusted.start();
  play(trusted, "ask-decision-criteria");
  assert.equal(trusted.currentBeat.id, "approval-priority");
  play(trusted, "quantify-support-value");
  assert.equal(trusted.currentBeat.id, "final-terms");
  play(trusted, "conditional-package");
  assert.equal(trusted.currentBeat.id, "successful-close");

  const overDiscounted = new ScenarioController(scenario);
  overDiscounted.start();
  play(overDiscounted, "offer-immediate-discount");
  assert.equal(overDiscounted.currentBeat.id, "price-pressure");
  play(overDiscounted, "use-final-discount");
  assert.equal(overDiscounted.state["concession-budget"], 0);
  play(overDiscounted, "conditional-package");
  assert.equal(overDiscounted.currentBeat.id, "guarded-close");
});

function play(controller, choiceId) {
  controller.recordResult({ choiceId, totalScore: 80, reactionSeconds: 1 });
  controller.advance();
}
