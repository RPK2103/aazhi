import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  isActiveConcern,
  normalizeMarineNumber,
  type RiskDelta,
  type RiskConcept,
  type VesselConcern,
} from "@/domain/risk";
import { conceptsExactMatch, normalizeConceptOrder } from "./concept-utils";
import type {
  EvaluationCheck,
  ExpectedMeasurementDelta,
  RiskScenario,
  ScenarioEvaluationResult,
  SerializableValue,
} from "./eval-types";

function toSerializable(value: unknown): SerializableValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item));
  }
  return String(value);
}

function makeCheck(
  name: string,
  passed: boolean,
  expected: SerializableValue,
  actual: SerializableValue,
): EvaluationCheck {
  return { name, passed, expected, actual };
}

function getSignedChange(delta: RiskDelta): number | null {
  if (
    typeof delta.previousValue === "number" &&
    typeof delta.currentValue === "number"
  ) {
    return normalizeMarineNumber(delta.currentValue - delta.previousValue);
  }
  return null;
}

function getCurrentActiveConcernConcepts(
  concerns: readonly VesselConcern[],
): readonly RiskConcept[] {
  return normalizeConceptOrder(
    concerns.filter(isActiveConcern).map((concern) => concern.concept),
  );
}

function checkMeasurementDelta(
  expected: ExpectedMeasurementDelta,
  actualDeltas: readonly RiskDelta[],
): EvaluationCheck {
  const actual = actualDeltas.find(
    (delta) => delta.measurement === expected.measurement,
  );

  if (actual === undefined) {
    return makeCheck(
      `measurementDelta:${expected.measurement}`,
      false,
      toSerializable(expected),
      null,
    );
  }

  const signedChange = getSignedChange(actual);
  const checks: boolean[] = [actual.type === expected.type];

  if (expected.signedChange !== undefined) {
    checks.push(signedChange === expected.signedChange);
  }
  if (expected.absoluteChange !== undefined) {
    checks.push(actual.absoluteChange === expected.absoluteChange);
  }
  checks.push(actual.reassessmentRelevant === expected.reassessmentRelevant);

  return makeCheck(
    `measurementDelta:${expected.measurement}`,
    checks.every(Boolean),
    toSerializable(expected),
    {
      type: actual.type,
      signedChange,
      absoluteChange: actual.absoluteChange ?? null,
      reassessmentRelevant: actual.reassessmentRelevant,
    },
  );
}

/**
 * Executes one risk scenario against the real Phase 2 domain functions.
 * Returns a structured result; expectation mismatches do not throw.
 */
export function evaluateRiskScenario(
  scenario: RiskScenario,
): ScenarioEvaluationResult {
  const deltas = calculateRiskDeltas(
    scenario.previousState,
    scenario.currentState,
  );

  const reassessment = evaluateReassessmentNeed(
    deltas,
    scenario.currentState.activeConcerns,
  );

  const actualActiveConcernConcepts = getCurrentActiveConcernConcepts(
    scenario.currentState.activeConcerns,
  );

  const checks: EvaluationCheck[] = [];

  checks.push(
    makeCheck(
      "deltaCount",
      deltas.length === scenario.expectations.expectedDeltaCount,
      scenario.expectations.expectedDeltaCount,
      deltas.length,
    ),
  );

  if (scenario.expectations.expectedDeltaTypes !== undefined) {
    const actualTypes = deltas.map((delta) => delta.type);
    const expectedTypes = [...scenario.expectations.expectedDeltaTypes];
    checks.push(
      makeCheck(
        "deltaTypes",
        JSON.stringify(actualTypes) === JSON.stringify(expectedTypes),
        toSerializable(expectedTypes),
        toSerializable(actualTypes),
      ),
    );
  }

  if (scenario.expectations.expectedDeltaConcepts !== undefined) {
    const actualConcepts = deltas.map((delta) => delta.concept);
    const expectedConcepts = [...scenario.expectations.expectedDeltaConcepts];
    checks.push(
      makeCheck(
        "deltaConcepts",
        JSON.stringify(actualConcepts) === JSON.stringify(expectedConcepts),
        toSerializable(expectedConcepts),
        toSerializable(actualConcepts),
      ),
    );
  }

  checks.push(
    makeCheck(
      "reassessmentRequired",
      reassessment.required ===
        scenario.expectations.expectedReassessmentRequired,
      scenario.expectations.expectedReassessmentRequired,
      reassessment.required,
    ),
  );

  checks.push(
    makeCheck(
      "reassessmentReason",
      reassessment.reason === scenario.expectations.expectedReassessmentReason,
      scenario.expectations.expectedReassessmentReason,
      reassessment.reason,
    ),
  );

  const normalizedActualTriggers = normalizeConceptOrder(
    reassessment.triggerConcepts,
  );
  const normalizedExpectedTriggers = normalizeConceptOrder(
    scenario.expectations.expectedTriggerConcepts,
  );

  checks.push(
    makeCheck(
      "triggerConcepts",
      conceptsExactMatch(
        scenario.expectations.expectedTriggerConcepts,
        reassessment.triggerConcepts,
      ),
      toSerializable([...normalizedExpectedTriggers]),
      toSerializable([...normalizedActualTriggers]),
    ),
  );

  if (scenario.expectations.expectedActiveConcernConcepts !== undefined) {
    const normalizedExpectedActive = normalizeConceptOrder(
      scenario.expectations.expectedActiveConcernConcepts,
    );
    checks.push(
      makeCheck(
        "activeConcernConcepts",
        conceptsExactMatch(
          scenario.expectations.expectedActiveConcernConcepts,
          actualActiveConcernConcepts,
        ),
        toSerializable([...normalizedExpectedActive]),
        toSerializable([...actualActiveConcernConcepts]),
      ),
    );
  }

  if (scenario.expectations.expectedMeasurementDeltas !== undefined) {
    for (const expectedMeasurement of scenario.expectations
      .expectedMeasurementDeltas) {
      checks.push(checkMeasurementDelta(expectedMeasurement, deltas));
    }
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: checks.every((check) => check.passed),
    checks,
    knownCapabilityGaps: scenario.knownCapabilityGaps ?? [],
  };
}
