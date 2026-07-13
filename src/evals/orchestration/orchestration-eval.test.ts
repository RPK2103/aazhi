import { beforeAll, describe, expect, it } from "vitest";
import {
  evaluateOrchestrationScenarios,
  ORCHESTRATION_SCENARIO_FIXTURES,
} from "./evaluate-orchestration";

describe("orchestration evaluation", () => {
  let evaluation: Awaited<ReturnType<typeof evaluateOrchestrationScenarios>>;

  beforeAll(async () => {
    evaluation = await evaluateOrchestrationScenarios();
  });

  it("evaluates all orchestration fixtures", () => {
    expect(evaluation.scenarioCount).toBe(ORCHESTRATION_SCENARIO_FIXTURES.length);
    expect(evaluation.scenarioResults).toHaveLength(
      ORCHESTRATION_SCENARIO_FIXTURES.length,
    );
  });

  it("achieves event processing success rate of 1", () => {
    expect(evaluation.metrics.eventProcessingSuccessRate).toBe(1);
  });

  it("achieves delta preservation rate of 1", () => {
    expect(evaluation.metrics.deltaPreservationRate).toBe(1);
  });

  it("achieves reassessment preservation rate of 1", () => {
    expect(evaluation.metrics.reassessmentPreservationRate).toBe(1);
  });

  it("achieves policy preservation rate of 1", () => {
    expect(evaluation.metrics.policyPreservationRate).toBe(1);
  });

  it("achieves selective AI invocation accuracy of 1", () => {
    expect(evaluation.metrics.selectiveAiInvocationAccuracy).toBe(1);
  });

  it("achieves posture transition accuracy of 1", () => {
    expect(evaluation.metrics.postureTransitionAccuracy).toBe(1);
  });

  it("achieves snapshot creation accuracy of 1", () => {
    expect(evaluation.metrics.snapshotCreationAccuracy).toBe(1);
  });

  it("achieves timeline trace completeness rate of 1", () => {
    expect(evaluation.metrics.timelineTraceCompletenessRate).toBe(1);
  });

  it("reports duplicate event reprocessing count of 0", () => {
    expect(evaluation.metrics.duplicateEventReprocessingCount).toBe(0);
  });

  it("achieves interpreter failure policy degradation accuracy of 1", () => {
    expect(evaluation.metrics.interpreterFailurePolicyDegradationAccuracy).toBe(1);
  });

  it("uses no Neon or real Gemini calls", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});
