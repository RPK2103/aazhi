import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  isActiveConcern,
  type MarineRiskState,
  type RiskState,
  type TripContext,
  type VesselConcern,
} from "@/domain/risk";

const PREVIOUS_EVALUATED_AT = "2026-07-12T06:00:00.000Z";
const CURRENT_EVALUATED_AT = "2026-07-12T07:00:00.000Z";

function concern(
  partial: Partial<VesselConcern> & Pick<VesselConcern, "id" | "status">,
): VesselConcern {
  return {
    vesselId: "TN-04",
    concept: "ENGINE_RELIABILITY",
    summary: "Engine stopped twice and required restart.",
    reportedAt: "2026-07-12T05:30:00.000Z",
    ...partial,
  };
}

function tripContext(): TripContext {
  return {
    tripId: "trip-s003-tn04",
    vesselId: "TN-04",
    crewCount: 5,
    plannedDurationHours: 8,
    tripStatus: "ACTIVE",
  };
}

function marineState(partial: Partial<MarineRiskState>): MarineRiskState {
  return {
    waveHeightM: null,
    wavePeriodS: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    capturedAt: CURRENT_EVALUATED_AT,
    ...partial,
  };
}

function riskState(
  marine: Partial<MarineRiskState>,
  concerns: readonly VesselConcern[],
  evaluatedAt: string,
  version: number,
): RiskState {
  return {
    tripContext: tripContext(),
    marineState: marineState({ ...marine, capturedAt: evaluatedAt }),
    activeConcerns: concerns,
    posture: "CAUTION",
    lastEvaluatedAt: evaluatedAt,
    version,
  };
}

describe("calculateRiskDeltas aggregate behaviour", () => {
  it("identical states produce zero aggregate deltas", () => {
    const state = riskState(
      { waveHeightM: 0.8, windSpeedKmh: 13 },
      [concern({ id: "c-1", status: "OPEN" })],
      PREVIOUS_EVALUATED_AT,
      1,
    );

    expect(calculateRiskDeltas(state, state)).toEqual([]);
  });

  it("orders marine deltas before concern deltas", () => {
    const previous = riskState(
      { waveHeightM: 0.8, windSpeedKmh: 10 },
      [concern({ id: "c-1", status: "OPEN" })],
      PREVIOUS_EVALUATED_AT,
      1,
    );
    const current = riskState(
      { waveHeightM: 1.5, windSpeedKmh: 10 },
      [concern({ id: "c-1", status: "RESOLUTION_REPORTED" })],
      CURRENT_EVALUATED_AT,
      2,
    );

    const deltas = calculateRiskDeltas(previous, current);

    expect(deltas[0]?.measurement).toBe("WAVE_HEIGHT_M");
    expect(deltas.at(-1)?.concernId).toBe("c-1");
  });
});

describe("S003 golden scenario", () => {
  /**
   * Golden scenario S003 — deterministic delta and reassessment gate.
   * Source: docs/evaluations/S003-unresolved-engine-worsening-marine-conditions.md
   */
  it("passes exactly for worsening marine with active engine concern", () => {
    const engineConcern = concern({
      id: "concern-engine-tn04-s003",
      status: "OPEN",
    });

    const previous = riskState(
      { waveHeightM: 0.8, windSpeedKmh: 13 },
      [engineConcern],
      PREVIOUS_EVALUATED_AT,
      1,
    );

    const current = riskState(
      { waveHeightM: 1.5, windSpeedKmh: 18 },
      [engineConcern],
      CURRENT_EVALUATED_AT,
      2,
    );

    expect(previous.posture).toBe("CAUTION");
    expect(current.posture).toBe("CAUTION");
    expect(isActiveConcern(engineConcern)).toBe(true);

    const deltas = calculateRiskDeltas(previous, current);

    expect(deltas).toHaveLength(2);

    const waveDelta = deltas.find(
      (delta) => delta.measurement === "WAVE_HEIGHT_M",
    );
    expect(waveDelta).toMatchObject({
      type: "VALUE_INCREASED",
      concept: "WAVE_CONDITIONS",
      previousValue: 0.8,
      currentValue: 1.5,
      absoluteChange: 0.7,
      reassessmentRelevant: true,
    });

    const windDelta = deltas.find(
      (delta) => delta.measurement === "WIND_SPEED_KMH",
    );
    expect(windDelta).toMatchObject({
      type: "VALUE_INCREASED",
      concept: "WIND_CONDITIONS",
      previousValue: 13,
      currentValue: 18,
      absoluteChange: 5,
      reassessmentRelevant: false,
    });

    expect(
      deltas.some((delta) => delta.type === "CONCERN_UNCHANGED"),
    ).toBe(false);

    const reassessment = evaluateReassessmentNeed(
      deltas,
      current.activeConcerns,
    );

    expect(reassessment).toEqual({
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      triggerConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
    });
  });
});
