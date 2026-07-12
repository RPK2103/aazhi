import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  isActiveConcern,
  type RiskConcept,
  type RiskDelta,
  type ReassessmentEvaluation,
  type VesselConcern,
} from "@/domain/risk";
import {
  buildRiskInterpretationInput,
  shouldInvokeRiskInterpreter,
  type RiskInterpretationInput,
} from "@/lib/ai";
import { conceptsExactMatch, normalizeConceptOrder } from "../concept-utils";
import type { RiskScenario } from "../eval-types";
import type {
  InterpreterBoundaryEvaluation,
  InterpreterInputChecks,
  InterpreterScenarioResult,
} from "./interpreter-eval-types";

function getActiveConcernConcepts(
  concerns: readonly VesselConcern[],
): readonly RiskConcept[] {
  return normalizeConceptOrder(
    concerns.filter(isActiveConcern).map((concern) => concern.concept),
  );
}

function deltasStructurallyEqual(
  left: readonly RiskDelta[],
  right: readonly RiskDelta[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftDelta, index) => {
    const rightDelta = right[index];
    if (rightDelta === undefined) {
      return false;
    }

    return (
      leftDelta.type === rightDelta.type &&
      leftDelta.concept === rightDelta.concept &&
      leftDelta.previousValue === rightDelta.previousValue &&
      leftDelta.currentValue === rightDelta.currentValue &&
      leftDelta.absoluteChange === rightDelta.absoluteChange &&
      leftDelta.reassessmentRelevant === rightDelta.reassessmentRelevant &&
      leftDelta.measurement === rightDelta.measurement &&
      leftDelta.concernId === rightDelta.concernId
    );
  });
}

function reassessmentDecisionsEqual(
  left: ReassessmentEvaluation,
  right: ReassessmentEvaluation,
): boolean {
  return (
    left.required === right.required &&
    left.reason === right.reason &&
    conceptsExactMatch(left.triggerConcepts, right.triggerConcepts)
  );
}

function evaluateScenarioInput(
  scenario: RiskScenario,
): InterpreterScenarioResult {
  const deltas = calculateRiskDeltas(
    scenario.previousState,
    scenario.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    scenario.currentState.activeConcerns,
  );
  const eligible = shouldInvokeRiskInterpreter(reassessment);

  if (!eligible) {
    return {
      scenarioId: scenario.id,
      eligible: false,
      inputConstructed: false,
      checks: {
        activeConcernInputMatch: true,
        deltaPreservationMatch: true,
        reassessmentDecisionPreservationMatch: true,
      },
      knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
    };
  }

  let input: RiskInterpretationInput;
  try {
    input = buildRiskInterpretationInput(
      scenario.currentState,
      deltas,
      reassessment,
    );
  } catch {
    return {
      scenarioId: scenario.id,
      eligible: true,
      inputConstructed: false,
      checks: {
        activeConcernInputMatch: false,
        deltaPreservationMatch: false,
        reassessmentDecisionPreservationMatch: false,
      },
      knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
    };
  }

  const expectedActiveConcepts =
    scenario.expectations.expectedActiveConcernConcepts !== undefined
      ? normalizeConceptOrder(
          scenario.expectations.expectedActiveConcernConcepts,
        )
      : getActiveConcernConcepts(scenario.currentState.activeConcerns);

  const actualActiveConcepts = getActiveConcernConcepts(input.activeConcerns);

  const checks: InterpreterInputChecks = {
    activeConcernInputMatch: conceptsExactMatch(
      expectedActiveConcepts,
      actualActiveConcepts,
    ),
    deltaPreservationMatch: deltasStructurallyEqual(
      deltas,
      input.calculatedDeltas,
    ),
    reassessmentDecisionPreservationMatch: reassessmentDecisionsEqual(
      reassessment,
      input.reassessmentDecision,
    ),
  };

  return {
    scenarioId: scenario.id,
    eligible: true,
    inputConstructed: true,
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
 * Evaluates deterministic interpreter-boundary properties across scenarios.
 * Does not invoke Gemini or judge natural-language quality.
 */
export function evaluateInterpreterBoundary(
  scenarios: readonly RiskScenario[],
): InterpreterBoundaryEvaluation {
  const results = scenarios.map(evaluateScenarioInput);
  const eligibleResults = results.filter((result) => result.eligible);

  const inputConstructionSuccessRate = computeRate(
    eligibleResults.filter((result) => result.inputConstructed).length,
    eligibleResults.length,
  );

  const activeConcernInputAccuracy = computeRate(
    eligibleResults.filter((result) => result.checks.activeConcernInputMatch)
      .length,
    eligibleResults.length,
  );

  const deltaPreservationRate = computeRate(
    eligibleResults.filter((result) => result.checks.deltaPreservationMatch)
      .length,
    eligibleResults.length,
  );

  const reassessmentDecisionPreservationRate = computeRate(
    eligibleResults.filter(
      (result) => result.checks.reassessmentDecisionPreservationMatch,
    ).length,
    eligibleResults.length,
  );

  return {
    totalScenarios: scenarios.length,
    eligibleScenarios: eligibleResults.length,
    skippedScenarios: results.length - eligibleResults.length,
    inputConstructionSuccessRate,
    activeConcernInputAccuracy,
    deltaPreservationRate,
    reassessmentDecisionPreservationRate,
    results,
  };
}
