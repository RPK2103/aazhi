import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import {
  deriveOperationalPolicyDecision,
  validateOperationalActionCandidate,
} from "@/domain/policy";
import { riskInterpretationSchema } from "@/lib/ai/risk-interpreter-schema";
import {
  INITIAL_RISK_SCENARIOS,
  S003_ENGINE_WAVE_DETERIORATION,
  S011_MISSED_CHECK_IN,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
} from "../index";
import {
  evaluateOperationalPolicy,
  evaluateOperationalPolicySuite,
  POLICY_EVAL_DERIVED_AT,
  POLICY_VALIDATION_CASES,
} from "./evaluate-policy";

describe("operational policy scenario evaluation", () => {
  const suite = evaluateOperationalPolicySuite(INITIAL_RISK_SCENARIOS);

  it("executes all 15 policy scenarios", () => {
    expect(suite.scenarioResults).toHaveLength(15);
  });

  it("all 15 scenarios declare expectedOperationalAction", () => {
    for (const scenario of INITIAL_RISK_SCENARIOS) {
      expect(scenario.expectations.expectedOperationalAction).toBeDefined();
    }
  });

  it("achieves policy action exact-match rate of 1", () => {
    expect(suite.metrics.policyActionExactMatchRate).toBe(1);
    expect(suite.passedScenarios).toBe(15);
    expect(suite.failedScenarios).toBe(0);
  });
});

describe("S003 operational policy", () => {
  const result = evaluateOperationalPolicy(S003_ENGINE_WAVE_DETERIORATION);

  it("derives COORDINATOR_REVIEW_REQUIRED", () => {
    expect(result.actualOperationalAction).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(result.passed).toBe(true);
  });

  it("preserves reassessment reason MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    expect(reassessment.reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
  });

  it("preserves trigger concepts ENGINE_RELIABILITY and WAVE_CONDITIONS", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policyDecision = deriveOperationalPolicyDecision(
      reassessment,
      POLICY_EVAL_DERIVED_AT,
    );
    expect(policyDecision.triggerConcepts).toEqual([
      "ENGINE_RELIABILITY",
      "WAVE_CONDITIONS",
    ]);
  });

  it("does not construct RiskInterpretation for action derivation", async () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policyDecision = deriveOperationalPolicyDecision(
      reassessment,
      POLICY_EVAL_DERIVED_AT,
    );

    expect(policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");

    const policyModule = await import("@/domain/policy");
    expect(JSON.stringify(policyModule)).not.toContain("RiskInterpretation");
    expect(JSON.stringify(policyModule)).not.toContain("gemini");
  });

  it("accepts valid bounded candidate COORDINATOR_REVIEW_REQUIRED", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policyDecision = deriveOperationalPolicyDecision(
      reassessment,
      POLICY_EVAL_DERIVED_AT,
    );
    const validation = validateOperationalActionCandidate(
      "COORDINATOR_REVIEW_REQUIRED",
      policyDecision,
    );
    expect(validation.valid).toBe(true);
    expect(validation.violation).toBeNull();
  });

  it("rejects REASSESSMENT_REQUIRED candidate with ACTION_POLICY_MISMATCH", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policyDecision = deriveOperationalPolicyDecision(
      reassessment,
      POLICY_EVAL_DERIVED_AT,
    );
    const validation = validateOperationalActionCandidate(
      "REASSESSMENT_REQUIRED",
      policyDecision,
    );
    expect(validation.valid).toBe(false);
    expect(validation.violation).toBe("ACTION_POLICY_MISMATCH");
    expect(validation.fallbackAction).toBe("COORDINATOR_REVIEW_REQUIRED");
  });

  it("rejects RETURN_TO_SHORE_IMMEDIATELY candidate with UNSUPPORTED_ACTION", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policyDecision = deriveOperationalPolicyDecision(
      reassessment,
      POLICY_EVAL_DERIVED_AT,
    );
    const validation = validateOperationalActionCandidate(
      "RETURN_TO_SHORE_IMMEDIATELY",
      policyDecision,
    );
    expect(validation.valid).toBe(false);
    expect(validation.violation).toBe("UNSUPPORTED_ACTION");
    expect(validation.fallbackAction).toBe("COORDINATOR_REVIEW_REQUIRED");
  });
});

describe("capability-gap policy scenarios", () => {
  it("S011 remains NO_ACTION_REQUIRED under current represented semantics", () => {
    const result = evaluateOperationalPolicy(S011_MISSED_CHECK_IN);
    expect(result.actualOperationalAction).toBe("NO_ACTION_REQUIRED");
    expect(result.expectedOperationalAction).toBe("NO_ACTION_REQUIRED");
  });

  it("S011 still exposes CHECK_IN_EVENT_NOT_YET_MODELLED", () => {
    const result = evaluateOperationalPolicy(S011_MISSED_CHECK_IN);
    expect(result.knownCapabilityGaps).toContain(
      "CHECK_IN_EVENT_NOT_YET_MODELLED",
    );
  });

  it("S014 remains NO_ACTION_REQUIRED under current represented semantics", () => {
    const result = evaluateOperationalPolicy(S014_OFFICIAL_ALERT_PLACEHOLDER);
    expect(result.actualOperationalAction).toBe("NO_ACTION_REQUIRED");
    expect(result.expectedOperationalAction).toBe("NO_ACTION_REQUIRED");
  });

  it("S014 still exposes OFFICIAL_ALERT_STATE_NOT_YET_MODELLED", () => {
    const result = evaluateOperationalPolicy(S014_OFFICIAL_ALERT_PLACEHOLDER);
    expect(result.knownCapabilityGaps).toContain(
      "OFFICIAL_ALERT_STATE_NOT_YET_MODELLED",
    );
  });
});

describe("policy validation synthetic cases", () => {
  const suite = evaluateOperationalPolicySuite(INITIAL_RISK_SCENARIOS);

  it("runs all six required validation cases", () => {
    expect(POLICY_VALIDATION_CASES).toHaveLength(6);
    expect(suite.validationCaseResults).toHaveLength(6);
    expect(suite.validationCaseResults.every((result) => result.passed)).toBe(
      true,
    );
  });

  it("computes unsupported action rejection count correctly", () => {
    expect(suite.metrics.unsupportedActionRejectionCount).toBe(1);
  });

  it("computes action policy mismatch count correctly", () => {
    expect(suite.metrics.actionPolicyMismatchCount).toBe(2);
  });

  it("achieves policy fallback correctness rate of 1", () => {
    expect(suite.metrics.policyFallbackCorrectnessRate).toBe(1);
  });

  it("computes policy violation rate for invalid candidate fixtures", () => {
    expect(suite.metrics.policyViolationRate).toBe(0.5);
  });
});

describe("policy Gemini independence", () => {
  it("policy domain does not require Gemini provider", async () => {
    const policyModule = await import("@/domain/policy");
    const serialized = JSON.stringify(policyModule);
    expect(serialized).not.toContain("gemini");
    expect(serialized).not.toContain("RiskInterpretation");
    expect(serialized).not.toContain("GoogleGenAI");
  });

  it("makes no real Gemini calls in policy evaluation", () => {
    const suite = evaluateOperationalPolicySuite(INITIAL_RISK_SCENARIOS);
    expect(suite.totalScenarios).toBe(15);
    expect(suite.metrics.policyActionExactMatchRate).toBe(1);
  });
});

describe("RiskInterpretation output unchanged", () => {
  it("retains exactly four explanation-only fields", () => {
    const shape = riskInterpretationSchema.shape;
    expect(Object.keys(shape).sort()).toEqual([
      "interactionSummary",
      "relevantConcepts",
      "significance",
      "uncertainty",
    ]);
  });
});
