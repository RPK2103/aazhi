import type { RiskConcept } from "@/domain/risk";
import type { SafetyRetrievalResult } from "@/domain/safety";

export interface RetrievalScenarioChecks {
  requestedConceptPreservationMatch: boolean;
  retrievalExecuted: boolean;
  provenanceComplete: boolean;
}

export interface RetrievalScenarioResult {
  scenarioId: string;
  eligible: boolean;
  requestedConcepts: readonly RiskConcept[];
  expectedRequestedConcepts: readonly RiskConcept[];
  retrievalResult: SafetyRetrievalResult | null;
  checks: RetrievalScenarioChecks;
  knownCapabilityGaps: readonly string[];
}

export interface RetrievalEvaluationMetrics {
  retrievalEligibilityCount: number;
  retrievalExecutionSuccessRate: number;
  requestedConceptPreservationRate: number;
  groundingCoverageRate: number;
  zeroResultRetrievalCount: number;
  provenanceCompletenessRate: number;
  fabricatedSourceAcceptanceCount: number;
}

export interface RetrievalSuiteEvaluation {
  totalScenarios: number;
  eligibleScenarios: number;
  skippedScenarios: number;
  results: readonly RetrievalScenarioResult[];
  metrics: RetrievalEvaluationMetrics;
}
