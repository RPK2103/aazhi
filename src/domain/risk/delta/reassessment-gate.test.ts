import { describe, expect, it } from "vitest";
import {
  DEFAULT_REASSESSMENT_SENSITIVITY,
  REASSESSMENT_REASON_PRECEDENCE,
  calculateMarineDeltas,
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  isActiveConcern,
  type MarineRiskState,
  type RiskState,
  type TripContext,
  type VesselConcern,
} from "@/domain/risk";

const DETECTED_AT = "2026-07-12T07:00:00.000Z";

function marineState(partial: Partial<MarineRiskState> = {}): MarineRiskState {
  return {
    waveHeightM: null,
    wavePeriodS: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    capturedAt: DETECTED_AT,
    ...partial,
  };
}

function concern(
  partial: Partial<VesselConcern> & Pick<VesselConcern, "id" | "status">,
): VesselConcern {
  return {
    vesselId: "TN-04",
    concept: "ENGINE_RELIABILITY",
    summary: "Engine issue",
    reportedAt: "2026-07-12T05:30:00.000Z",
    ...partial,
  };
}

function tripContext(): TripContext {
  return {
    tripId: "trip-1",
    vesselId: "TN-04",
    crewCount: 5,
    plannedDurationHours: 8,
    tripStatus: "ACTIVE",
    marineReferenceLocation: {
      latitude: 13.125,
      longitude: 80.3,
      label: "Chennai / Kasimedu",
    },
  };
}

function riskState(
  marine: Partial<MarineRiskState>,
  concerns: readonly VesselConcern[],
): RiskState {
  return {
    tripContext: tripContext(),
    marineState: marineState(marine),
    activeConcerns: concerns,
    posture: "CAUTION",
    lastEvaluatedAt: DETECTED_AT,
    version: 1,
  };
}

describe("evaluateReassessmentNeed", () => {
  it("returns NO_MATERIAL_CHANGE when there are no deltas", () => {
    expect(evaluateReassessmentNeed([], [])).toEqual({
      required: false,
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
    });
  });

  it("does not require reassessment for marine change below sensitivity", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 1.0 }),
      marineState({ waveHeightM: 1.3 }),
      DETECTED_AT,
      DEFAULT_REASSESSMENT_SENSITIVITY,
    );

    expect(evaluateReassessmentNeed(deltas, [])).toEqual({
      required: false,
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
    });
  });

  it("requires reassessment for material marine change without active concern", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );

    expect(evaluateReassessmentNeed(deltas, [])).toEqual({
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
      triggerConcepts: ["WAVE_CONDITIONS"],
    });
  });

  it("uses interaction reason when material marine change has active concern", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );
    const activeConcerns = [concern({ id: "c-1", status: "OPEN" })];

    expect(evaluateReassessmentNeed(deltas, activeConcerns)).toEqual({
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      triggerConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
    });
  });

  it("treats active RESOLUTION_REPORTED concern as participating in interaction reasoning", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );
    const activeConcerns = [
      concern({ id: "c-1", status: "RESOLUTION_REPORTED" }),
    ];

    expect(isActiveConcern(activeConcerns[0]!)).toBe(true);
    expect(evaluateReassessmentNeed(deltas, activeConcerns).reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
  });

  it("does not treat RESOLVED concern as active for interaction reasoning", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );
    const inactiveConcerns = [concern({ id: "c-1", status: "RESOLVED" })];

    expect(isActiveConcern(inactiveConcerns[0]!)).toBe(false);
    expect(evaluateReassessmentNeed(deltas, inactiveConcerns)).toEqual({
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
      triggerConcepts: ["WAVE_CONDITIONS"],
    });
  });

  it("requires reassessment when concern state changes", () => {
    const previous = riskState(
      { waveHeightM: 1.0 },
      [concern({ id: "c-1", status: "OPEN" })],
    );
    const current = riskState(
      { waveHeightM: 1.0 },
      [concern({ id: "c-1", status: "RESOLUTION_REPORTED" })],
    );

    const deltas = calculateRiskDeltas(previous, current);
    const result = evaluateReassessmentNeed(deltas, current.activeConcerns);

    expect(result).toEqual({
      required: true,
      reason: "CONCERN_STATE_CHANGED",
      triggerConcepts: ["ENGINE_RELIABILITY"],
    });
  });

  it("deduplicates trigger concepts", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8, wavePeriodS: 4 }),
      marineState({ waveHeightM: 1.5, wavePeriodS: 6 }),
      DETECTED_AT,
    );

    const result = evaluateReassessmentNeed(deltas, []);
    const waveConceptCount = result.triggerConcepts.filter(
      (concept) => concept === "WAVE_CONDITIONS",
    ).length;

    expect(waveConceptCount).toBe(1);
  });

  it("orders trigger concepts deterministically by risk concept vocabulary", () => {
    const deltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8, windSpeedKmh: 10 }),
      marineState({ waveHeightM: 1.5, windSpeedKmh: 25 }),
      DETECTED_AT,
    );

    const result = evaluateReassessmentNeed(deltas, []);
    expect(result.triggerConcepts).toEqual(["WAVE_CONDITIONS", "WIND_CONDITIONS"]);
  });
});

describe("REASSESSMENT_REASON_PRECEDENCE", () => {
  it("ranks OFFICIAL_ALERT_CHANGED above interaction environmental reason", () => {
    const officialAlertDelta = {
      id: "alert:1",
      type: "VALUE_INCREASED" as const,
      concept: "OFFICIAL_ALERT" as const,
      previousValue: 0,
      currentValue: 1,
      reassessmentRelevant: true,
      detectedAt: DETECTED_AT,
    };
    const marineDeltas = calculateMarineDeltas(
      marineState({ waveHeightM: 0.8 }),
      marineState({ waveHeightM: 1.5 }),
      DETECTED_AT,
    );

    const result = evaluateReassessmentNeed(
      [...marineDeltas, officialAlertDelta],
      [concern({ id: "c-1", status: "OPEN" })],
    );

    expect(result.reason).toBe("OFFICIAL_ALERT_CHANGED");
    expect(REASSESSMENT_REASON_PRECEDENCE.at(-1)).toBe("OFFICIAL_ALERT_CHANGED");
  });

  it("ranks interaction environmental reason above concern-only change", () => {
    const previous = riskState(
      { waveHeightM: 0.8 },
      [concern({ id: "c-1", status: "OPEN" })],
    );
    const current = riskState(
      { waveHeightM: 1.5 },
      [concern({ id: "c-1", status: "RESOLUTION_REPORTED" })],
    );

    const deltas = calculateRiskDeltas(previous, current);
    const result = evaluateReassessmentNeed(deltas, current.activeConcerns);

    expect(result.reason).toBe(
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    );
  });

  it("ranks concern state change above material environmental change alone", () => {
    const previous = riskState(
      { waveHeightM: 0.8 },
      [concern({ id: "c-1", status: "OPEN" })],
    );
    const current = riskState(
      { waveHeightM: 1.5 },
      [],
    );

    const deltas = calculateRiskDeltas(previous, current);
    const result = evaluateReassessmentNeed(deltas, current.activeConcerns);

    expect(result.reason).toBe("CONCERN_STATE_CHANGED");
  });
});
