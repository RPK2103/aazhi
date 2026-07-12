import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import {
  deriveOperationalPolicyDecision,
  validateOperationalActionCandidate,
  type OperationalAction,
  type OperationalPolicyDecision,
  type PolicyViolationType,
} from "@/domain/policy";
import type { RiskScenario } from "../eval-types";
import type {
  PolicyEvaluationCheck,
  PolicyEvaluationMetrics,
  PolicySuiteEvaluation,
  PolicyValidationCase,
  PolicyValidationCaseResult,
  ScenarioPolicyEvaluationResult,
} from "./policy-eval-types";

/** Explicit deterministic timestamp for policy derivation in evaluation. */
export const POLICY_EVAL_DERIVED_AT = "2026-07-12T12:00:00.000Z";

/**
 * Synthetic candidate-validation fixtures for policy validator evaluation.
 * Does not use Gemini output as candidates.
 */
export const POLICY_VALIDATION_CASES: readonly PolicyValidationCase[] = [
  {
    id: "CASE-1",
    expectedAction: "COORDINATOR_REVIEW_REQUIRED",
    candidate: "COORDINATOR_REVIEW_REQUIRED",
    expectedValid: true,
    expectedViolation: null,
  },
  {
    id: "CASE-2",
    expectedAction: "COORDINATOR_REVIEW_REQUIRED",
    candidate: "REASSESSMENT_REQUIRED",
    expectedValid: false,
    expectedViolation: "ACTION_POLICY_MISMATCH",
  },
  {
    id: "CASE-3",
    expectedAction: "COORDINATOR_REVIEW_REQUIRED",
    candidate: "RETURN_TO_SHORE_IMMEDIATELY",
    expectedValid: false,
    expectedViolation: "UNSUPPORTED_ACTION",
  },
  {
    id: "CASE-4",
    expectedAction: "NO_ACTION_REQUIRED",
    candidate: "NO_ACTION_REQUIRED",
    expectedValid: true,
    expectedViolation: null,
  },
  {
    id: "CASE-5",
    expectedAction: "REASSESSMENT_REQUIRED",
    candidate: "OFFICIAL_ALERT_PRIORITY",
    expectedValid: false,
    expectedViolation: "ACTION_POLICY_MISMATCH",
  },
  {
    id: "CASE-6",
    expectedAction: "OFFICIAL_ALERT_PRIORITY",
    candidate: "OFFICIAL_ALERT_PRIORITY",
    expectedValid: true,
    expectedViolation: null,
  },
] as const;

function makeSyntheticPolicyDecision(
  action: OperationalAction,
): OperationalPolicyDecision {
  const reasonByAction = {
    NO_ACTION_REQUIRED: "NO_MATERIAL_CHANGE",
    REASSESSMENT_REQUIRED: "MATERIAL_ENVIRONMENTAL_CHANGE",
    COORDINATOR_REVIEW_REQUIRED:
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    OFFICIAL_ALERT_PRIORITY: "OFFICIAL_ALERT_CHANGED",
  } as const;

  return {
    action,
    reason: reasonByAction[action],
    triggerConcepts: [],
    derivedAt: POLICY_EVAL_DERIVED_AT,
  };
}

function makeCheck(
  name: string,
  passed: boolean,
  expected: string,
  actual: string,
): PolicyEvaluationCheck {
  return { name, passed, expected, actual };
}

/**
 * Evaluates one scenario through the real deterministic policy flow:
 * calculateRiskDeltas → evaluateReassessmentNeed → deriveOperationalPolicyDecision.
 */
export function evaluateOperationalPolicy(
  scenario: RiskScenario,
  derivedAt: string = POLICY_EVAL_DERIVED_AT,
): ScenarioPolicyEvaluationResult {
  const deltas = calculateRiskDeltas(
    scenario.previousState,
    scenario.currentState,
  );

  const reassessment = evaluateReassessmentNeed(
    deltas,
    scenario.currentState.activeConcerns,
  );

  const policyDecision = deriveOperationalPolicyDecision(
    reassessment,
    derivedAt,
  );

  const expectedAction = scenario.expectations.expectedOperationalAction;
  const checks: PolicyEvaluationCheck[] = [
    makeCheck(
      "operationalAction",
      policyDecision.action === expectedAction,
      expectedAction,
      policyDecision.action,
    ),
    makeCheck(
      "reassessmentReasonPreserved",
      policyDecision.reason === reassessment.reason,
      reassessment.reason,
      policyDecision.reason,
    ),
    makeCheck(
      "derivedAt",
      policyDecision.derivedAt === derivedAt,
      derivedAt,
      policyDecision.derivedAt,
    ),
  ];

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: checks.every((check) => check.passed),
    actualOperationalAction: policyDecision.action,
    expectedOperationalAction: expectedAction,
    checks,
    knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
  };
}

export function evaluatePolicyValidationCase(
  validationCase: PolicyValidationCase,
): PolicyValidationCaseResult {
  const expectedDecision = makeSyntheticPolicyDecision(
    validationCase.expectedAction,
  );
  const result = validateOperationalActionCandidate(
    validationCase.candidate,
    expectedDecision,
  );

  const passed =
    result.valid === validationCase.expectedValid &&
    result.violation === validationCase.expectedViolation &&
    result.fallbackAction === validationCase.expectedAction;

  return {
    caseId: validationCase.id,
    passed,
    valid: result.valid,
    violation: result.violation,
    fallbackAction: result.fallbackAction,
  };
}

export function computePolicyMetrics(
  scenarioResults: readonly ScenarioPolicyEvaluationResult[],
  validationCaseResults: readonly PolicyValidationCaseResult[],
): PolicyEvaluationMetrics {
  const totalScenarios = scenarioResults.length;
  const actionMatches = scenarioResults.filter(
    (result) => result.actualOperationalAction === result.expectedOperationalAction,
  ).length;

  const invalidCases = validationCaseResults.filter(
    (result) => !result.valid,
  );
  const totalValidationCases = validationCaseResults.length;

  let unsupportedActionRejectionCount = 0;
  let actionPolicyMismatchCount = 0;

  for (const caseResult of validationCaseResults) {
    if (caseResult.violation === "UNSUPPORTED_ACTION") {
      unsupportedActionRejectionCount += 1;
    }
    if (caseResult.violation === "ACTION_POLICY_MISMATCH") {
      actionPolicyMismatchCount += 1;
    }
  }

  const fallbackCorrect = invalidCases.filter((caseResult) => {
    const validationCase = POLICY_VALIDATION_CASES.find(
      (fixture) => fixture.id === caseResult.caseId,
    );
    return (
      validationCase !== undefined &&
      caseResult.fallbackAction === validationCase.expectedAction
    );
  }).length;

  return {
    policyActionExactMatchRate:
      totalScenarios === 0 ? 0 : actionMatches / totalScenarios,
    policyViolationRate:
      totalValidationCases === 0
        ? 0
        : invalidCases.length / totalValidationCases,
    unsupportedActionRejectionCount,
    actionPolicyMismatchCount,
    policyFallbackCorrectnessRate:
      invalidCases.length === 0 ? 1 : fallbackCorrect / invalidCases.length,
  };
}

export function evaluateOperationalPolicySuite(
  scenarios: readonly RiskScenario[],
  validationCases: readonly PolicyValidationCase[] = POLICY_VALIDATION_CASES,
  derivedAt: string = POLICY_EVAL_DERIVED_AT,
): PolicySuiteEvaluation {
  const scenarioResults = scenarios.map((scenario) =>
    evaluateOperationalPolicy(scenario, derivedAt),
  );
  const validationCaseResults = validationCases.map((validationCase) =>
    evaluatePolicyValidationCase(validationCase),
  );

  const passedScenarios = scenarioResults.filter((result) => result.passed).length;

  return {
    totalScenarios: scenarios.length,
    passedScenarios,
    failedScenarios: scenarios.length - passedScenarios,
    scenarioResults,
    validationCaseResults,
    metrics: computePolicyMetrics(scenarioResults, validationCaseResults),
  };
}

export type { PolicyViolationType };
