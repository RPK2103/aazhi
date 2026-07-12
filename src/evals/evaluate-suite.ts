import type {
  DeterministicEvaluationMetrics,
  KnownCapabilityGap,
  RiskScenario,
  ScenarioSuiteEvaluation,
} from "./eval-types";
import { evaluateRiskScenario } from "./evaluate-scenario";
import { computeDeterministicMetrics } from "./metrics";

/**
 * Evaluates a suite of risk scenarios and returns aggregate deterministic metrics.
 * scenarioPassRate is the fraction of scenarios that passed (0–1, not rounded).
 */
export function evaluateRiskScenarioSuite(
  scenarios: readonly RiskScenario[],
): ScenarioSuiteEvaluation {
  const results = scenarios.map((scenario) => evaluateRiskScenario(scenario));
  const passedScenarios = results.filter((result) => result.passed).length;
  const totalScenarios = scenarios.length;

  return {
    totalScenarios,
    passedScenarios,
    failedScenarios: totalScenarios - passedScenarios,
    scenarioPassRate:
      totalScenarios === 0 ? 0 : passedScenarios / totalScenarios,
    results,
    metrics: computeDeterministicMetrics(scenarios, results),
  };
}

export type { ScenarioSuiteEvaluation, DeterministicEvaluationMetrics, KnownCapabilityGap };
