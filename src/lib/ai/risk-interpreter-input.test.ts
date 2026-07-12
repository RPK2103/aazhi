import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  type ReassessmentEvaluation,
  type RiskDelta,
} from "@/domain/risk";
import {
  buildRiskState,
  buildTripContext,
  engineConcern,
  STABLE_MARINE,
} from "@/evals/fixtures/risk-state-factory";
import {
  buildRiskInterpretationInput,
  shouldInvokeRiskInterpreter,
} from "./risk-interpreter-input";

describe("buildRiskInterpretationInput", () => {
  const openConcern = engineConcern("concern-open", "OPEN");
  const resolvedConcern = engineConcern("concern-resolved", "RESOLVED");
  const dismissedConcern = engineConcern("concern-dismissed", "DISMISSED");

  const currentState = buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [openConcern, resolvedConcern, dismissedConcern],
    lastEvaluatedAt: "2026-07-12T07:00:00.000Z",
    version: 2,
    tripContext: buildTripContext({ crewCount: 5, plannedDurationHours: 8 }),
  });

  const deltas: RiskDelta[] = [];
  const reassessment: ReassessmentEvaluation = {
    required: false,
    reason: "NO_MATERIAL_CHANGE",
    triggerConcepts: [],
  };

  it("includes only active concerns", () => {
    const input = buildRiskInterpretationInput(
      currentState,
      deltas,
      reassessment,
    );
    expect(input.activeConcerns).toHaveLength(1);
    expect(input.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("excludes RESOLVED concern from interpreter input", () => {
    const input = buildRiskInterpretationInput(
      currentState,
      deltas,
      reassessment,
    );
    expect(
      input.activeConcerns.some((concern) => concern.status === "RESOLVED"),
    ).toBe(false);
  });

  it("excludes DISMISSED concern from interpreter input", () => {
    const input = buildRiskInterpretationInput(
      currentState,
      deltas,
      reassessment,
    );
    expect(
      input.activeConcerns.some((concern) => concern.status === "DISMISSED"),
    ).toBe(false);
  });

  it("preserves trip context exactly", () => {
    const input = buildRiskInterpretationInput(
      currentState,
      deltas,
      reassessment,
    );
    expect(input.tripContext).toEqual(currentState.tripContext);
    expect(input.tripContext).not.toBe(currentState.tripContext);
  });

  it("preserves calculated deltas exactly", () => {
    const previous = buildRiskState({
      marineState: { ...STABLE_MARINE, waveHeightM: 0.8 },
      activeConcerns: [openConcern],
      lastEvaluatedAt: "2026-07-12T06:00:00.000Z",
      version: 1,
    });
    const current = buildRiskState({
      marineState: { ...STABLE_MARINE, waveHeightM: 1.5 },
      activeConcerns: [openConcern],
      lastEvaluatedAt: "2026-07-12T07:00:00.000Z",
      version: 2,
    });
    const calculated = calculateRiskDeltas(previous, current);
    const decision = evaluateReassessmentNeed(
      calculated,
      current.activeConcerns,
    );
    const input = buildRiskInterpretationInput(current, calculated, decision);

    expect(input.calculatedDeltas).toEqual(calculated);
    expect(input.calculatedDeltas).not.toBe(calculated);
  });

  it("preserves reassessment decision exactly", () => {
    const decision: ReassessmentEvaluation = {
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      triggerConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
    };
    const input = buildRiskInterpretationInput(
      currentState,
      deltas,
      decision,
    );
    expect(input.reassessmentDecision).toEqual(decision);
    expect(input.reassessmentDecision.triggerConcepts).not.toBe(
      decision.triggerConcepts,
    );
  });
});

describe("shouldInvokeRiskInterpreter", () => {
  it("returns false when required is false", () => {
    expect(
      shouldInvokeRiskInterpreter({
        required: false,
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
      }),
    ).toBe(false);
  });

  it("returns true when required is true", () => {
    expect(
      shouldInvokeRiskInterpreter({
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      }),
    ).toBe(true);
  });
});
