import type { KnownCapabilityGap } from "../eval-types";

export interface InterpreterInputChecks {
  activeConcernInputMatch: boolean;
  deltaPreservationMatch: boolean;
  reassessmentDecisionPreservationMatch: boolean;
}

export interface InterpreterScenarioResult {
  scenarioId: string;
  eligible: boolean;
  inputConstructed: boolean;
  checks: InterpreterInputChecks;
  knownCapabilityGaps: readonly KnownCapabilityGap[];
}

export interface InterpreterBoundaryEvaluation {
  totalScenarios: number;
  eligibleScenarios: number;
  skippedScenarios: number;
  inputConstructionSuccessRate: number;
  activeConcernInputAccuracy: number;
  deltaPreservationRate: number;
  reassessmentDecisionPreservationRate: number;
  results: readonly InterpreterScenarioResult[];
}
