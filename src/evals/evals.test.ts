import { describe, expect, it } from "vitest";
import { conceptsExactMatch } from "./concept-utils";
import { evaluateRiskScenario } from "./evaluate-scenario";
import { evaluateRiskScenarioSuite } from "./evaluate-suite";
import {
  computeDeterministicMetrics,
  formatScenarioSuiteReport,
} from "./metrics";
import {
  INITIAL_RISK_SCENARIOS,
  S003_ENGINE_WAVE_DETERIORATION,
  S006_MISSING_COMMS_LONG_TRIP,
  S011_MISSED_CHECK_IN,
  S012_MISSED_CHECK_IN_COMMS_CONCERN,
  S013_IRRELEVANT_STATE_CHANGE,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
  type RiskScenario,
} from "./index";
import {
  buildRiskState,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "./fixtures/risk-state-factory";

describe("evaluateRiskScenario", () => {
  it("returns passed true for a fully passing scenario", () => {
    const result = evaluateRiskScenario(S003_ENGINE_WAVE_DETERIORATION);
    expect(result.passed).toBe(true);
  });

  it("returns passed false for mismatched expected delta count", () => {
    const scenario: RiskScenario = {
      ...S003_ENGINE_WAVE_DETERIORATION,
      expectations: {
        ...S003_ENGINE_WAVE_DETERIORATION.expectations,
        expectedDeltaCount: 99,
      },
    };
    const result = evaluateRiskScenario(scenario);
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "deltaCount")?.passed).toBe(
      false,
    );
  });

  it("returns passed false for mismatched reassessment expectation", () => {
    const scenario: RiskScenario = {
      ...INITIAL_RISK_SCENARIOS[0]!,
      expectations: {
        ...INITIAL_RISK_SCENARIOS[0]!.expectations,
        expectedReassessmentRequired: true,
      },
    };
    const result = evaluateRiskScenario(scenario);
    expect(result.passed).toBe(false);
    expect(
      result.checks.find((c) => c.name === "reassessmentRequired")?.passed,
    ).toBe(false);
  });

  it("returns passed false for mismatched reassessment reason", () => {
    const scenario: RiskScenario = {
      ...S003_ENGINE_WAVE_DETERIORATION,
      expectations: {
        ...S003_ENGINE_WAVE_DETERIORATION.expectations,
        expectedReassessmentReason: "NO_MATERIAL_CHANGE",
      },
    };
    const result = evaluateRiskScenario(scenario);
    expect(result.passed).toBe(false);
    expect(
      result.checks.find((c) => c.name === "reassessmentReason")?.passed,
    ).toBe(false);
  });
});

describe("conceptsExactMatch", () => {
  it("ignores ordering when comparing trigger concepts", () => {
    expect(
      conceptsExactMatch(
        ["WAVE_CONDITIONS", "ENGINE_RELIABILITY"],
        ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
      ),
    ).toBe(true);
  });

  it("does not ignore missing concepts", () => {
    expect(
      conceptsExactMatch(["ENGINE_RELIABILITY"], ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"]),
    ).toBe(false);
  });
});

describe("evaluateRiskScenarioSuite", () => {
  const suite = evaluateRiskScenarioSuite(INITIAL_RISK_SCENARIOS);

  it("computes correct suite totals", () => {
    expect(suite.totalScenarios).toBe(15);
    expect(suite.passedScenarios + suite.failedScenarios).toBe(15);
  });

  it("calculates scenario pass rate correctly", () => {
    expect(suite.scenarioPassRate).toBe(suite.passedScenarios / 15);
  });

  it("counts false escalations correctly for the initial suite", () => {
    expect(suite.metrics.falseEscalationCount).toBe(0);
  });

  it("counts missed reassessments correctly for the initial suite", () => {
    expect(suite.metrics.missedReassessmentCount).toBe(0);
  });

  it("computes reassessment expectation accuracy correctly", () => {
    expect(suite.metrics.reassessmentExpectationAccuracy).toBe(1);
  });

  it("computes reassessment reason accuracy correctly", () => {
    expect(suite.metrics.reassessmentReasonAccuracy).toBe(1);
  });

  it("computes trigger concept exact match rate correctly", () => {
    expect(suite.metrics.triggerConceptExactMatchRate).toBe(1);
  });

  it("computes active concern carry-forward accuracy correctly", () => {
    expect(suite.metrics.activeConcernCarryForwardAccuracy).toBe(1);
  });

  it("counts known capability-gap scenarios correctly", () => {
    expect(suite.metrics.scenariosWithKnownCapabilityGaps).toBe(5);
  });

  it("aggregates capability-gap counts correctly", () => {
    expect(suite.metrics.knownCapabilityGapCounts).toEqual({
      TRIP_DURATION_NOT_YET_COMPARED: 1,
      CHECK_IN_EVENT_NOT_YET_MODELLED: 3,
      OFFICIAL_ALERT_STATE_NOT_YET_MODELLED: 1,
    });
  });

  it("executes all 15 initial scenarios without external calls", () => {
    expect(suite.results).toHaveLength(15);
    for (const result of suite.results) {
      expect(result.checks.length).toBeGreaterThan(0);
    }
  });

  it("passes the complete initial 15-scenario suite", () => {
    expect(suite.passedScenarios).toBe(15);
    expect(suite.failedScenarios).toBe(0);
    expect(suite.scenarioPassRate).toBe(1);
  });
});

describe("S003 golden scenario", () => {
  const result = evaluateRiskScenario(S003_ENGINE_WAVE_DETERIORATION);

  it("passes S003", () => {
    expect(result.passed).toBe(true);
  });

  it("passes S003 exact expected wave delta", () => {
    expect(
      result.checks.find((c) => c.name === "measurementDelta:WAVE_HEIGHT_M")
        ?.passed,
    ).toBe(true);
  });

  it("passes S003 exact expected wind delta", () => {
    expect(
      result.checks.find((c) => c.name === "measurementDelta:WIND_SPEED_KMH")
        ?.passed,
    ).toBe(true);
  });

  it("passes S003 reassessment check", () => {
    expect(
      result.checks.find((c) => c.name === "reassessmentRequired")?.passed,
    ).toBe(true);
  });

  it("passes S003 reason check", () => {
    expect(
      result.checks.find((c) => c.name === "reassessmentReason")?.passed,
    ).toBe(true);
  });

  it("passes S003 trigger concept check", () => {
    expect(
      result.checks.find((c) => c.name === "triggerConcepts")?.passed,
    ).toBe(true);
  });
});

describe("capability-gap scenarios", () => {
  it("S006 exposes TRIP_DURATION_NOT_YET_COMPARED", () => {
    const result = evaluateRiskScenario(S006_MISSING_COMMS_LONG_TRIP);
    expect(result.knownCapabilityGaps).toContain(
      "TRIP_DURATION_NOT_YET_COMPARED",
    );
  });

  it("S011 exposes CHECK_IN_EVENT_NOT_YET_MODELLED", () => {
    const result = evaluateRiskScenario(S011_MISSED_CHECK_IN);
    expect(result.knownCapabilityGaps).toContain(
      "CHECK_IN_EVENT_NOT_YET_MODELLED",
    );
  });

  it("S012 exposes CHECK_IN_EVENT_NOT_YET_MODELLED", () => {
    const result = evaluateRiskScenario(S012_MISSED_CHECK_IN_COMMS_CONCERN);
    expect(result.knownCapabilityGaps).toContain(
      "CHECK_IN_EVENT_NOT_YET_MODELLED",
    );
  });

  it("S014 exposes OFFICIAL_ALERT_STATE_NOT_YET_MODELLED", () => {
    const result = evaluateRiskScenario(S014_OFFICIAL_ALERT_PLACEHOLDER);
    expect(result.knownCapabilityGaps).toContain(
      "OFFICIAL_ALERT_STATE_NOT_YET_MODELLED",
    );
  });
});

describe("S013 irrelevant state change", () => {
  it("proves version-only change creates no reassessment", () => {
    const result = evaluateRiskScenario(S013_IRRELEVANT_STATE_CHANGE);
    expect(result.passed).toBe(true);
    expect(
      result.checks.find((c) => c.name === "reassessmentRequired")?.actual,
    ).toBe(false);
  });
});

describe("computeDeterministicMetrics edge cases", () => {
  it("counts false escalation when expected false but actual true", () => {
    const scenario: RiskScenario = {
      ...S003_ENGINE_WAVE_DETERIORATION,
      expectations: {
        ...S003_ENGINE_WAVE_DETERIORATION.expectations,
        expectedReassessmentRequired: false,
      },
    };
    const result = evaluateRiskScenario(scenario);
    const metrics = computeDeterministicMetrics([scenario], [result]);
    expect(metrics.falseEscalationCount).toBe(1);
    expect(metrics.missedReassessmentCount).toBe(0);
  });

  it("counts missed reassessment when expected true but actual false", () => {
    const scenario: RiskScenario = {
      ...INITIAL_RISK_SCENARIOS[0]!,
      expectations: {
        ...INITIAL_RISK_SCENARIOS[0]!.expectations,
        expectedReassessmentRequired: true,
      },
    };
    const result = evaluateRiskScenario(scenario);
    const metrics = computeDeterministicMetrics([scenario], [result]);
    expect(metrics.missedReassessmentCount).toBe(1);
    expect(metrics.falseEscalationCount).toBe(0);
  });
});

describe("formatScenarioSuiteReport", () => {
  it("formats a passing suite report", () => {
    const suite = evaluateRiskScenarioSuite(INITIAL_RISK_SCENARIOS);
    const report = formatScenarioSuiteReport(suite);
    expect(report).toContain("AAZHI DETERMINISTIC RISK EVALUATION");
    expect(report).toContain("Scenarios: 15");
    expect(report).toContain("CHECK_IN_EVENT_NOT_YET_MODELLED: 3");
  });
});

describe("eval harness isolation", () => {
  it("does not import Gemini", async () => {
    const evalModule = await import("./index");
    expect(Object.keys(evalModule)).not.toContain("generateAssessment");
    expect(JSON.stringify(evalModule)).not.toContain("gemini");
  });
});

describe("stable identical-state scenario", () => {
  it("produces zero deltas for structurally equivalent states", () => {
    const state = buildRiskState({
      marineState: STABLE_MARINE,
      activeConcerns: [],
      lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
      version: 1,
    });
    const scenario: RiskScenario = {
      id: "TEST-IDENTICAL",
      name: "Test identical",
      description: "Inline identical state test",
      previousState: state,
      currentState: state,
      expectations: {
        expectedDeltaCount: 0,
        expectedReassessmentRequired: false,
        expectedReassessmentReason: "NO_MATERIAL_CHANGE",
        expectedTriggerConcepts: [],
      },
    };
    expect(evaluateRiskScenario(scenario).passed).toBe(true);
  });
});
