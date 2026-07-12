import { conceptsExactMatch } from "./concept-utils";
import type {
  DeterministicEvaluationMetrics,
  KnownCapabilityGap,
  RiskScenario,
  ScenarioEvaluationResult,
  ScenarioSuiteEvaluation,
} from "./eval-types";

function emptyCapabilityGapCounts(): Record<KnownCapabilityGap, number> {
  return {
    TRIP_DURATION_NOT_YET_COMPARED: 0,
    CHECK_IN_EVENT_NOT_YET_MODELLED: 0,
    OFFICIAL_ALERT_STATE_NOT_YET_MODELLED: 0,
  };
}

function getCheckValue(
  result: ScenarioEvaluationResult,
  checkName: string,
): unknown {
  return result.checks.find((check) => check.name === checkName)?.actual;
}

export function computeDeterministicMetrics(
  scenarios: readonly RiskScenario[],
  results: readonly ScenarioEvaluationResult[],
): DeterministicEvaluationMetrics {
  let reassessmentExpectationMatches = 0;
  let reassessmentReasonMatches = 0;
  let triggerConceptMatches = 0;
  let activeConcernScenarios = 0;
  let activeConcernMatches = 0;
  let falseEscalationCount = 0;
  let missedReassessmentCount = 0;
  let scenariosWithKnownCapabilityGaps = 0;
  const knownCapabilityGapCounts = emptyCapabilityGapCounts();

  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index]!;
    const result = results[index]!;
    const expectations = scenario.expectations;

    const actualRequired = getCheckValue(result, "reassessmentRequired");
    if (actualRequired === expectations.expectedReassessmentRequired) {
      reassessmentExpectationMatches += 1;
    } else if (
      expectations.expectedReassessmentRequired === false &&
      actualRequired === true
    ) {
      falseEscalationCount += 1;
    } else if (
      expectations.expectedReassessmentRequired === true &&
      actualRequired === false
    ) {
      missedReassessmentCount += 1;
    }

    const actualReason = getCheckValue(result, "reassessmentReason");
    if (actualReason === expectations.expectedReassessmentReason) {
      reassessmentReasonMatches += 1;
    }

    const actualTriggers = result.checks.find(
      (check) => check.name === "triggerConcepts",
    )?.actual;
    if (
      Array.isArray(actualTriggers) &&
      conceptsExactMatch(
        expectations.expectedTriggerConcepts,
        actualTriggers as Parameters<typeof conceptsExactMatch>[1],
      )
    ) {
      triggerConceptMatches += 1;
    }

    if (expectations.expectedActiveConcernConcepts !== undefined) {
      activeConcernScenarios += 1;
      const activeCheck = result.checks.find(
        (check) => check.name === "activeConcernConcepts",
      );
      if (activeCheck?.passed === true) {
        activeConcernMatches += 1;
      }
    }

    if (result.knownCapabilityGaps.length > 0) {
      scenariosWithKnownCapabilityGaps += 1;
      for (const gap of result.knownCapabilityGaps) {
        knownCapabilityGapCounts[gap] += 1;
      }
    }
  }

  const total = scenarios.length;

  return {
    reassessmentExpectationAccuracy:
      total === 0 ? 0 : reassessmentExpectationMatches / total,
    reassessmentReasonAccuracy:
      total === 0 ? 0 : reassessmentReasonMatches / total,
    triggerConceptExactMatchRate:
      total === 0 ? 0 : triggerConceptMatches / total,
    activeConcernCarryForwardAccuracy:
      activeConcernScenarios === 0
        ? 1
        : activeConcernMatches / activeConcernScenarios,
    falseEscalationCount,
    missedReassessmentCount,
    scenariosWithKnownCapabilityGaps,
    knownCapabilityGapCounts,
  };
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Formats a deterministic scenario-suite evaluation as human-readable text.
 * Does not write to disk or invoke external services.
 */
export function formatScenarioSuiteReport(
  evaluation: ScenarioSuiteEvaluation,
): string {
  const { metrics } = evaluation;
  const lines = [
    "AAZHI DETERMINISTIC RISK EVALUATION",
    "",
    `Scenarios: ${evaluation.totalScenarios}`,
    `Passed: ${evaluation.passedScenarios}`,
    `Failed: ${evaluation.failedScenarios}`,
    `Scenario pass rate: ${formatPercent(evaluation.scenarioPassRate)}`,
    "",
    `Reassessment expectation accuracy: ${formatPercent(metrics.reassessmentExpectationAccuracy)}`,
    `Reassessment reason accuracy: ${formatPercent(metrics.reassessmentReasonAccuracy)}`,
    `Trigger concept exact match rate: ${formatPercent(metrics.triggerConceptExactMatchRate)}`,
    `Active concern carry-forward accuracy: ${formatPercent(metrics.activeConcernCarryForwardAccuracy)}`,
    "",
    `False escalations: ${metrics.falseEscalationCount}`,
    `Missed reassessments: ${metrics.missedReassessmentCount}`,
    "",
    "Known capability gaps:",
  ];

  const gapEntries = Object.entries(metrics.knownCapabilityGapCounts).filter(
    ([, count]) => count > 0,
  );

  if (gapEntries.length === 0) {
    lines.push("  (none)");
  } else {
    for (const [gap, count] of gapEntries) {
      lines.push(`  ${gap}: ${count}`);
    }
  }

  lines.push(
    "",
    "Note: These metrics measure conformance to synthetic deterministic product",
    "scenarios. They do not measure accident prediction, vessel safety, maritime",
    "safety outcomes, or field effectiveness.",
  );

  return lines.join("\n");
}
