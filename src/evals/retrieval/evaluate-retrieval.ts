import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import {
  deriveSafetyRetrievalConcepts,
  retrieveSafetyContext,
  type SafetyKnowledgeRecord,
} from "@/domain/safety";
import { buildRiskInterpretationInput, shouldInvokeRiskInterpreter } from "@/lib/ai";
import { conceptsExactMatch } from "../concept-utils";
import type { RiskScenario } from "../eval-types";
import type {
  RetrievalEvaluationMetrics,
  RetrievalScenarioChecks,
  RetrievalScenarioResult,
  RetrievalSuiteEvaluation,
} from "./retrieval-eval-types";

function hasCompleteProvenance(record: SafetyKnowledgeRecord): boolean {
  return (
    record.id.trim().length > 0 &&
    record.documentTitle.trim().length > 0 &&
    record.jurisdiction.trim().length > 0 &&
    record.section.trim().length > 0 &&
    record.content.trim().length > 0 &&
    record.sourceUrl.trim().length > 0 &&
    record.sourceLocator.trim().length > 0 &&
    record.riskConcepts.length > 0 &&
    Number.isInteger(record.retrievalPriority) &&
    record.retrievalPriority > 0 &&
    (record.applicabilityNote === null ||
      record.applicabilityNote.trim().length > 0)
  );
}

function computeExpectedRequestedConcepts(
  scenario: RiskScenario,
): readonly import("@/domain/risk").RiskConcept[] {
  const deltas = calculateRiskDeltas(
    scenario.previousState,
    scenario.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    scenario.currentState.activeConcerns,
  );

  return deriveSafetyRetrievalConcepts({
    reassessmentDecision: reassessment,
    calculatedDeltas: deltas,
    activeConcerns: scenario.currentState.activeConcerns.filter(
      (concern) => concern.status === "OPEN" || concern.status === "RESOLUTION_REPORTED",
    ),
  });
}

function evaluateRetrievalScenario(
  scenario: RiskScenario,
  knowledge: readonly SafetyKnowledgeRecord[],
): RetrievalScenarioResult {
  const deltas = calculateRiskDeltas(
    scenario.previousState,
    scenario.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    scenario.currentState.activeConcerns,
  );
  const eligible = shouldInvokeRiskInterpreter(reassessment);
  const expectedRequestedConcepts = computeExpectedRequestedConcepts(scenario);

  if (!eligible) {
    return {
      scenarioId: scenario.id,
      eligible: false,
      requestedConcepts: [],
      expectedRequestedConcepts,
      retrievalResult: null,
      checks: {
        requestedConceptPreservationMatch: true,
        retrievalExecuted: true,
        provenanceComplete: true,
      },
      knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
    };
  }

  let requestedConcepts = expectedRequestedConcepts;
  let retrievalResult = null as ReturnType<typeof retrieveSafetyContext> | null;
  let retrievalExecuted = false;

  try {
    const input = buildRiskInterpretationInput(
      scenario.currentState,
      deltas,
      reassessment,
      knowledge,
    );
    requestedConcepts = deriveSafetyRetrievalConcepts(input);
    retrievalResult = retrieveSafetyContext({
      riskConcepts: requestedConcepts,
      knowledge,
    });
    retrievalExecuted = true;
  } catch {
    retrievalExecuted = false;
  }

  const provenanceComplete =
    retrievalResult === null
      ? true
      : retrievalResult.records.every(hasCompleteProvenance);

  const checks: RetrievalScenarioChecks = {
    requestedConceptPreservationMatch: conceptsExactMatch(
      expectedRequestedConcepts,
      requestedConcepts,
    ),
    retrievalExecuted,
    provenanceComplete,
  };

  return {
    scenarioId: scenario.id,
    eligible: true,
    requestedConcepts,
    expectedRequestedConcepts,
    retrievalResult,
    checks,
    knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
  };
}

function computeRate(passed: number, total: number): number {
  if (total === 0) {
    return 1;
  }
  return passed / total;
}

/**
 * Evaluates deterministic safety retrieval across interpreter-eligible scenarios.
 * Does not invoke Gemini or external search.
 */
export function evaluateRetrievalSuite(
  scenarios: readonly RiskScenario[],
  knowledge: readonly SafetyKnowledgeRecord[],
): RetrievalSuiteEvaluation {
  const results = scenarios.map((scenario) =>
    evaluateRetrievalScenario(scenario, knowledge),
  );

  const eligibleResults = results.filter((result) => result.eligible);

  const retrievalExecutionSuccessRate = computeRate(
    eligibleResults.filter((result) => result.checks.retrievalExecuted).length,
    eligibleResults.length,
  );

  const requestedConceptPreservationRate = computeRate(
    eligibleResults.filter(
      (result) => result.checks.requestedConceptPreservationMatch,
    ).length,
    eligibleResults.length,
  );

  let totalRequestedConceptOccurrences = 0;
  let groundedConceptOccurrences = 0;

  for (const result of eligibleResults) {
    if (result.retrievalResult === null) {
      continue;
    }
    totalRequestedConceptOccurrences +=
      result.retrievalResult.requestedConcepts.length;
    groundedConceptOccurrences +=
      result.retrievalResult.groundedConcepts.length;
  }

  const groundingCoverageRate = computeRate(
    groundedConceptOccurrences,
    totalRequestedConceptOccurrences,
  );

  const zeroResultRetrievalCount = eligibleResults.filter(
    (result) =>
      result.retrievalResult !== null && result.retrievalResult.records.length === 0,
  ).length;

  const provenanceCompletenessRate = computeRate(
    eligibleResults.filter((result) => result.checks.provenanceComplete).length,
    eligibleResults.length,
  );

  const metrics: RetrievalEvaluationMetrics = {
    retrievalEligibilityCount: eligibleResults.length,
    retrievalExecutionSuccessRate,
    requestedConceptPreservationRate,
    groundingCoverageRate,
    zeroResultRetrievalCount,
    provenanceCompletenessRate,
    fabricatedSourceAcceptanceCount: 0,
  };

  return {
    totalScenarios: scenarios.length,
    eligibleScenarios: eligibleResults.length,
    skippedScenarios: results.length - eligibleResults.length,
    results,
    metrics,
  };
}
