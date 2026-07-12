import { describe, expect, it } from "vitest";
import { deriveSafetyRetrievalConcepts } from "@/domain/safety";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import {
  INITIAL_RISK_SCENARIOS,
  S003_ENGINE_WAVE_DETERIORATION,
  S011_MISSED_CHECK_IN,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
} from "@/evals";
import { buildRiskInterpretationInput, shouldInvokeRiskInterpreter } from "@/lib/ai";
import { evaluateRetrievalSuite } from "./evaluate-retrieval";

describe("evaluateRetrievalSuite", () => {
  const evaluation = evaluateRetrievalSuite(
    INITIAL_RISK_SCENARIOS,
    INITIAL_SAFETY_KNOWLEDGE,
  );

  it("covers all 15 scenarios", () => {
    expect(evaluation.totalScenarios).toBe(15);
    expect(evaluation.results).toHaveLength(15);
  });

  it("counts four interpreter-eligible scenarios", () => {
    expect(evaluation.metrics.retrievalEligibilityCount).toBe(4);
  });

  it("achieves retrieval execution success rate of 1", () => {
    expect(evaluation.metrics.retrievalExecutionSuccessRate).toBe(1);
  });

  it("achieves requested concept preservation rate of 1", () => {
    expect(evaluation.metrics.requestedConceptPreservationRate).toBe(1);
  });

  it("achieves provenance completeness rate of 1", () => {
    expect(evaluation.metrics.provenanceCompletenessRate).toBe(1);
  });

  it("reports fabricated source acceptance count of 0", () => {
    expect(evaluation.metrics.fabricatedSourceAcceptanceCount).toBe(0);
  });
});

describe("S003 retrieval evaluation", () => {
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
    INITIAL_SAFETY_KNOWLEDGE,
  );
  const concepts = deriveSafetyRetrievalConcepts(input);
  const s003Result = evaluateRetrievalSuite(
    INITIAL_RISK_SCENARIOS,
    INITIAL_SAFETY_KNOWLEDGE,
  ).results.find((result) => result.scenarioId === "S003");

  it("requests ENGINE_RELIABILITY and WAVE_CONDITIONS", () => {
    expect(concepts).toEqual(["ENGINE_RELIABILITY", "WAVE_CONDITIONS"]);
  });

  it("grounds ENGINE_RELIABILITY from corpus", () => {
    expect(s003Result?.retrievalResult?.groundedConcepts).toContain(
      "ENGINE_RELIABILITY",
    );
  });

  it("grounds WAVE_CONDITIONS from INCOIS corpus", () => {
    expect(s003Result?.retrievalResult?.groundedConcepts).toContain(
      "WAVE_CONDITIONS",
    );
    expect(s003Result?.retrievalResult?.ungroundedConcepts).not.toContain(
      "WAVE_CONDITIONS",
    );
  });

  it("does not treat INCOIS wave record as a safety threshold", () => {
    const waveRecord = s003Result?.retrievalResult?.records.find(
      (record) => record.id === "sk-incois-wave-context-001",
    );
    expect(waveRecord?.applicabilityNote).toContain(
      "does not define an AAZHI vessel-safety or danger threshold",
    );
  });

  it("does not request WIND_CONDITIONS solely from non-relevant wind delta", () => {
    expect(concepts).not.toContain("WIND_CONDITIONS");
  });

  it("reports grounding coverage rate from revised corpus", () => {
    const evaluation = evaluateRetrievalSuite(
      INITIAL_RISK_SCENARIOS,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    expect(evaluation.metrics.groundingCoverageRate).toBeGreaterThan(0);
    expect(evaluation.metrics.groundingCoverageRate).toBeLessThanOrEqual(1);
  });
});

describe("capability gap retrieval protection", () => {
  it("S011 does not use unmodelled check-in for retrieval", () => {
    const deltas = calculateRiskDeltas(
      S011_MISSED_CHECK_IN.previousState,
      S011_MISSED_CHECK_IN.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S011_MISSED_CHECK_IN.currentState.activeConcerns,
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);

    const input = buildRiskInterpretationInput(
      S011_MISSED_CHECK_IN.currentState,
      deltas,
      reassessment,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    expect(deriveSafetyRetrievalConcepts(input)).toEqual([]);
  });

  it("S014 does not use unmodelled official alert for retrieval", () => {
    const deltas = calculateRiskDeltas(
      S014_OFFICIAL_ALERT_PLACEHOLDER.previousState,
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState.activeConcerns,
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);

    const input = buildRiskInterpretationInput(
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState,
      deltas,
      reassessment,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    expect(deriveSafetyRetrievalConcepts(input)).toEqual([]);
  });
});
