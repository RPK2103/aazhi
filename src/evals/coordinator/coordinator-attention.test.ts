import { beforeAll, describe, expect, it } from "vitest";
import {
  COORDINATOR_SCENARIO_EXPECTATIONS,
  evaluateCoordinatorAttentionScenarios,
  evaluateCoordinatorEmptyState,
} from "./evaluate-coordinator-attention";

describe("coordinator attention evaluation", () => {
  let evaluation: Awaited<ReturnType<typeof evaluateCoordinatorAttentionScenarios>>;

  beforeAll(async () => {
    evaluation = await evaluateCoordinatorAttentionScenarios();
  });

  it("evaluates all coordinator fixtures", () => {
    expect(evaluation.scenarioCount).toBe(COORDINATOR_SCENARIO_EXPECTATIONS.length);
    expect(evaluation.scenarioResults).toHaveLength(
      COORDINATOR_SCENARIO_EXPECTATIONS.length,
    );
  });

  it("achieves attention classification accuracy of 1", () => {
    expect(evaluation.metrics.attentionClassificationAccuracy).toBe(1);
  });

  it("achieves attention ordering accuracy of 1", () => {
    expect(evaluation.metrics.attentionOrderingAccuracy).toBe(1);
  });

  it("achieves attention basis selection accuracy of 1", () => {
    expect(evaluation.metrics.attentionBasisSelectionAccuracy).toBe(1);
  });

  it("achieves latest manual check selection accuracy of 1", () => {
    expect(evaluation.metrics.latestManualCheckSelectionAccuracy).toBe(1);
  });

  it("achieves latest policy action preservation rate of 1", () => {
    expect(evaluation.metrics.latestPolicyActionPreservationRate).toBe(1);
  });

  it("achieves attention basis policy preservation rate of 1", () => {
    expect(evaluation.metrics.attentionBasisPolicyPreservationRate).toBe(1);
  });

  it("achieves active concern preservation rate of 1", () => {
    expect(evaluation.metrics.activeConcernPreservationRate).toBe(1);
  });

  it("achieves timeline validation rate of 1", () => {
    expect(evaluation.metrics.timelineValidationRate).toBe(1);
  });

  it("reports AI ranking invocation count of 0", () => {
    expect(evaluation.metrics.aiRankingInvocationCount).toBe(0);
  });

  it("reports failed interpretation fabrication count of 0", () => {
    expect(evaluation.metrics.failedInterpretationFabricationCount).toBe(0);
  });

  it("handles C012 empty active trips", async () => {
    const empty = await evaluateCoordinatorEmptyState();
    expect(empty.summary.totalActiveTrips).toBe(0);
    expect(empty.attentionRequired).toHaveLength(0);
    expect(empty.watch).toHaveLength(0);
    expect(empty.stable).toHaveLength(0);
  });

  it("uses no Neon or real Gemini calls", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});
