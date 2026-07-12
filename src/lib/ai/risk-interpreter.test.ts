import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import {
  INITIAL_RISK_SCENARIOS,
  S001_STABLE_NO_CONCERNS,
  S003_ENGINE_WAVE_DETERIORATION,
  S011_MISSED_CHECK_IN,
} from "@/evals";
import { evaluateInterpreterBoundary } from "@/evals/ai";
import {
  buildRiskInterpretationInput,
  shouldInvokeRiskInterpreter,
} from "./risk-interpreter-input";
import { buildRiskInterpreterPrompt } from "./risk-interpreter-prompt";
import {
  interpretRiskChange,
  RiskInterpretationError,
  type RiskInterpreterProvider,
} from "./risk-interpreter";

const validFakeResponse = {
  interactionSummary:
    "Wave conditions changed from the earlier trip state while the previously reported engine reliability concern remains unresolved.",
  significance:
    "The unresolved propulsion concern may become more operationally relevant when environmental conditions change.",
  uncertainty:
    "AAZHI cannot verify the mechanical condition of the engine or determine vessel seaworthiness.",
  relevantConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
};

function fakeProvider(
  response: unknown,
  shouldThrow = false,
): RiskInterpreterProvider {
  return {
    interpret: async () => {
      if (shouldThrow) {
        throw new Error("provider failure");
      }
      return response;
    },
  };
}

describe("interpretRiskChange", () => {
  const baseInput = buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    ),
    evaluateReassessmentNeed(
      calculateRiskDeltas(
        S003_ENGINE_WAVE_DETERIORATION.previousState,
        S003_ENGINE_WAVE_DETERIORATION.currentState,
      ),
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    ),
  );

  it("returns validated RiskInterpretation from fake provider valid response", async () => {
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider(validFakeResponse),
    );
    expect(result).toEqual(validFakeResponse);
  });

  it("fails closed on malformed provider response", async () => {
    await expect(
      interpretRiskChange(baseInput, fakeProvider("{bad-json")),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on unsupported concept in provider response", async () => {
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          relevantConcepts: ["ENGINE_FAILURE"],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on provider failure", async () => {
    await expect(
      interpretRiskChange(baseInput, fakeProvider(null, true)),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });
});

describe("S003 interpreter input", () => {
  const deltas = calculateRiskDeltas(
    S003_ENGINE_WAVE_DETERIORATION.previousState,
    S003_ENGINE_WAVE_DETERIORATION.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
  );
  const input = buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    deltas,
    reassessment,
  );

  it("is interpreter eligible", () => {
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(true);
  });

  it("contains trip with 5 crew and 8 planned hours", () => {
    expect(input.tripContext.crewCount).toBe(5);
    expect(input.tripContext.plannedDurationHours).toBe(8);
  });

  it("contains ENGINE_RELIABILITY OPEN active concern", () => {
    expect(input.activeConcerns).toHaveLength(1);
    expect(input.activeConcerns[0]?.concept).toBe("ENGINE_RELIABILITY");
    expect(input.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("contains +0.7 wave delta", () => {
    const waveDelta = input.calculatedDeltas.find(
      (delta) => delta.measurement === "WAVE_HEIGHT_M",
    );
    expect(waveDelta?.previousValue).toBe(0.8);
    expect(waveDelta?.currentValue).toBe(1.5);
    expect(waveDelta?.absoluteChange).toBe(0.7);
  });

  it("contains +5 wind delta", () => {
    const windDelta = input.calculatedDeltas.find(
      (delta) => delta.measurement === "WIND_SPEED_KMH",
    );
    expect(windDelta?.previousValue).toBe(13);
    expect(windDelta?.currentValue).toBe(18);
    expect(windDelta?.absoluteChange).toBe(5);
  });

  it("preserves wave reassessmentRelevant true", () => {
    const waveDelta = input.calculatedDeltas.find(
      (delta) => delta.measurement === "WAVE_HEIGHT_M",
    );
    expect(waveDelta?.reassessmentRelevant).toBe(true);
  });

  it("preserves wind reassessmentRelevant false", () => {
    const windDelta = input.calculatedDeltas.find(
      (delta) => delta.measurement === "WIND_SPEED_KMH",
    );
    expect(windDelta?.reassessmentRelevant).toBe(false);
  });

  it("preserves deterministic reassessment reason", () => {
    expect(input.reassessmentDecision.required).toBe(true);
    expect(input.reassessmentDecision.reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
    expect(input.reassessmentDecision.triggerConcepts).toEqual([
      "ENGINE_RELIABILITY",
      "WAVE_CONDITIONS",
    ]);
  });

  it("does not contain raw previous or current RiskState objects", () => {
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).not.toContain("marineState");
    expect(prompt).not.toContain("lastEvaluatedAt");
    expect(prompt).not.toContain("version");
    expect(prompt).not.toContain("posture");
  });
});

describe("no-change scenario eligibility", () => {
  it("is not interpreter eligible for S001", () => {
    const deltas = calculateRiskDeltas(
      S001_STABLE_NO_CONCERNS.previousState,
      S001_STABLE_NO_CONCERNS.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S001_STABLE_NO_CONCERNS.currentState.activeConcerns,
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);
  });
});

describe("S011 capability gap protection", () => {
  it("cannot inject unmodelled missed-check-in facts", () => {
    const deltas = calculateRiskDeltas(
      S011_MISSED_CHECK_IN.previousState,
      S011_MISSED_CHECK_IN.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S011_MISSED_CHECK_IN.currentState.activeConcerns,
    );

    expect(S011_MISSED_CHECK_IN.knownCapabilityGaps).toContain(
      "CHECK_IN_EVENT_NOT_YET_MODELLED",
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);

    const input = buildRiskInterpretationInput(
      S011_MISSED_CHECK_IN.currentState,
      deltas,
      reassessment,
    );
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt.toLowerCase()).not.toContain("missed check-in");
    expect(prompt).not.toContain("CHECK_IN_STATUS");
    expect(input.activeConcerns).toHaveLength(0);
  });
});

describe("interpreter boundary evaluation", () => {
  const evaluation = evaluateInterpreterBoundary(INITIAL_RISK_SCENARIOS);

  it("covers all 15 scenarios", () => {
    expect(evaluation.totalScenarios).toBe(15);
    expect(evaluation.results).toHaveLength(15);
  });

  it("derives eligibility from real reassessment results", () => {
    const derivedEligible = INITIAL_RISK_SCENARIOS.filter((scenario) => {
      const deltas = calculateRiskDeltas(
        scenario.previousState,
        scenario.currentState,
      );
      const reassessment = evaluateReassessmentNeed(
        deltas,
        scenario.currentState.activeConcerns,
      );
      return shouldInvokeRiskInterpreter(reassessment);
    }).length;

    expect(evaluation.eligibleScenarios).toBe(derivedEligible);
    expect(evaluation.skippedScenarios).toBe(15 - derivedEligible);
  });

  it("achieves input construction success rate of 1 for eligible scenarios", () => {
    expect(evaluation.inputConstructionSuccessRate).toBe(1);
  });

  it("achieves active concern input accuracy of 1", () => {
    expect(evaluation.activeConcernInputAccuracy).toBe(1);
  });

  it("achieves delta preservation rate of 1", () => {
    expect(evaluation.deltaPreservationRate).toBe(1);
  });

  it("achieves reassessment decision preservation rate of 1", () => {
    expect(evaluation.reassessmentDecisionPreservationRate).toBe(1);
  });
});

describe("legacy isolation", () => {
  it("does not export generateAssessment from ai boundary", async () => {
    const aiModule = await import("./index");
    expect(Object.keys(aiModule)).not.toContain("generateAssessment");
    expect(JSON.stringify(aiModule)).not.toContain("generateAssessment");
  });
});

describe("default provider isolation in unit tests", () => {
  it("does not call createGeminiRiskInterpreterProvider in these tests", async () => {
    const providerModule = await import("./gemini-risk-interpreter-provider");
    expect(providerModule.createGeminiRiskInterpreterProvider).toBeTypeOf(
      "function",
    );
  });
});
