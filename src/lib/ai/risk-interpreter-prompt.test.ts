import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import { buildRiskState, STABLE_MARINE } from "@/evals/fixtures/risk-state-factory";
import { buildRiskInterpretationInput } from "./risk-interpreter-input";
import {
  buildRiskInterpreterPrompt,
  RISK_INTERPRETER_SYSTEM_INSTRUCTION,
} from "./risk-interpreter-prompt";

describe("buildRiskInterpreterPrompt", () => {
  it("states interpreter boundaries in system instruction", () => {
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "You are the AAZHI Risk Interpreter.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "You do not determine whether reassessment is required.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "Reassessment sensitivity is not a maritime danger threshold.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain("0.5 m wave change");
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain("10 km/h wind change");
  });

  it("separates trip context, concerns, deltas, and reassessment sections", () => {
    const input = buildRiskInterpretationInput(
      buildRiskState({
        marineState: STABLE_MARINE,
        activeConcerns: [],
        lastEvaluatedAt: "2026-07-12T07:00:00.000Z",
        version: 1,
      }),
      [],
      {
        required: false,
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
      },
    );

    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).toContain("TRIP CONTEXT:");
    expect(prompt).toContain("ACTIVE CONCERNS:");
    expect(prompt).toContain("CALCULATED DELTAS:");
    expect(prompt).toContain("DETERMINISTIC REASSESSMENT DECISION:");
    expect(prompt).not.toContain("previousState");
    expect(prompt).not.toContain("currentState");
  });

  it("includes structured delta values with signedChange when numeric", () => {
    const previous = buildRiskState({
      marineState: { ...STABLE_MARINE, waveHeightM: 0.8, windSpeedKmh: 13 },
      activeConcerns: [],
      lastEvaluatedAt: "2026-07-12T06:00:00.000Z",
      version: 1,
    });
    const current = buildRiskState({
      marineState: { ...STABLE_MARINE, waveHeightM: 1.5, windSpeedKmh: 18 },
      activeConcerns: [],
      lastEvaluatedAt: "2026-07-12T07:00:00.000Z",
      version: 2,
    });
    const deltas = calculateRiskDeltas(previous, current);
    const decision = evaluateReassessmentNeed(deltas, current.activeConcerns);
    const input = buildRiskInterpretationInput(current, deltas, decision);
    const prompt = buildRiskInterpreterPrompt(input);

    expect(prompt).toContain('"signedChange": 0.7');
    expect(prompt).toContain('"signedChange": 5');
    expect(prompt).toContain('"reassessmentRelevant": true');
    expect(prompt).toContain('"reassessmentRelevant": false');
  });
});
