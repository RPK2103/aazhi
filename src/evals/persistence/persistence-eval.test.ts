import { describe, expect, it } from "vitest";
import { evaluatePersistenceScenarios } from "./evaluate-persistence";

describe("evaluatePersistenceScenarios", () => {
  it("executes without Neon", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.scenarioCount).toBeGreaterThan(0);
    expect(process.env.DATABASE_URL).toBeUndefined();
  });

  it("achieves active concern carry-forward accuracy of 1", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.metrics.activeConcernCarryForwardAccuracy).toBe(1);
  });

  it("achieves inactive concern exclusion accuracy of 1", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.metrics.inactiveConcernExclusionAccuracy).toBe(1);
  });

  it("achieves risk state round-trip accuracy of 1", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.metrics.riskStateRoundTripAccuracy).toBe(1);
  });

  it("achieves historical snapshot immutability accuracy of 1", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.metrics.historicalSnapshotImmutabilityAccuracy).toBe(1);
  });

  it("achieves invalid domain value rejection rate of 1", async () => {
    const evaluation = await evaluatePersistenceScenarios();
    expect(evaluation.metrics.invalidDomainValueRejectionRate).toBe(1);
  });
});
