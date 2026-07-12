import type { OperationalAction, PolicyViolationType } from "@/domain/policy";
import type { RiskScenario } from "../eval-types";

export interface PolicyEvaluationCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface ScenarioPolicyEvaluationResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  actualOperationalAction: OperationalAction;
  expectedOperationalAction: OperationalAction;
  checks: readonly PolicyEvaluationCheck[];
  knownCapabilityGaps: RiskScenario["knownCapabilityGaps"];
}

export interface PolicyValidationCase {
  id: string;
  expectedAction: OperationalAction;
  candidate: unknown;
  expectedValid: boolean;
  expectedViolation: PolicyViolationType | null;
}

export interface PolicyValidationCaseResult {
  caseId: string;
  passed: boolean;
  valid: boolean;
  violation: PolicyViolationType | null;
  fallbackAction: OperationalAction;
}

export interface PolicyEvaluationMetrics {
  policyActionExactMatchRate: number;
  policyViolationRate: number;
  unsupportedActionRejectionCount: number;
  actionPolicyMismatchCount: number;
  policyFallbackCorrectnessRate: number;
}

export interface PolicySuiteEvaluation {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  scenarioResults: readonly ScenarioPolicyEvaluationResult[];
  metrics: PolicyEvaluationMetrics;
  validationCaseResults: readonly PolicyValidationCaseResult[];
}
