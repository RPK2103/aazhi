import { describe, expect, it } from "vitest";
import {
  DEPARTURE_POSTURES,
  RISK_CONCEPTS,
  RISK_POSTURES,
  TRIP_STATUSES,
  isActiveConcern,
  isRiskConcept,
  isValidRiskStateVersion,
  type MarineRiskState,
  type RiskState,
  type TripContext,
  type VesselConcern,
} from "./index";

describe("domain barrel and posture vocabularies", () => {
  it("exports bounded risk postures for active trips", () => {
    expect(RISK_POSTURES).toEqual([
      "BASELINE",
      "CAUTION",
      "REASSESSMENT_REQUIRED",
      "COORDINATOR_REVIEW_REQUIRED",
      "OFFICIAL_ALERT_PRIORITY",
    ]);
  });

  it("exports departure postures separately from active-trip postures", () => {
    expect(DEPARTURE_POSTURES).toEqual([
      "DEPARTURE_HOLD",
      "PRE_DEPARTURE_ACTION_REQUIRED",
      "DELAY_AND_REASSESS",
      "CAUTION",
    ]);
  });

  it("exports trip statuses and risk concepts from the barrel", () => {
    expect(TRIP_STATUSES).toEqual([
      "PLANNED",
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(RISK_CONCEPTS).toContain("ENGINE_RELIABILITY");
  });
});

describe("isValidRiskStateVersion", () => {
  it("rejects zero", () => {
    expect(isValidRiskStateVersion(0)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isValidRiskStateVersion(-1)).toBe(false);
    expect(isValidRiskStateVersion(-99)).toBe(false);
  });

  it("accepts positive integers", () => {
    expect(isValidRiskStateVersion(1)).toBe(true);
    expect(isValidRiskStateVersion(2)).toBe(true);
    expect(isValidRiskStateVersion(42)).toBe(true);
  });

  it("rejects non-integers and non-finite values", () => {
    expect(isValidRiskStateVersion(1.5)).toBe(false);
    expect(isValidRiskStateVersion(Number.NaN)).toBe(false);
    expect(isValidRiskStateVersion(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("MarineRiskState", () => {
  it("supports null marine measurements", () => {
    const marine: MarineRiskState = {
      waveHeightM: null,
      wavePeriodS: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
      capturedAt: "2026-07-12T06:00:00.000Z",
    };

    expect(marine.waveHeightM).toBeNull();
    expect(marine.wavePeriodS).toBeNull();
    expect(marine.windSpeedKmh).toBeNull();
    expect(marine.windDirectionDeg).toBeNull();
  });
});

describe("S003 initial risk state representation", () => {
  /**
   * Golden scenario S003 — initial state only.
   * Source: docs/evaluations/S003-unresolved-engine-worsening-marine-conditions.md
   * Does not calculate the future 0.8 → 1.5 marine delta (Phase 2).
   */
  it("represents the S003 initial risk state exactly", () => {
    expect(isRiskConcept("ENGINE_RELIABILITY")).toBe(true);

    const concern: VesselConcern = {
      id: "concern-engine-tn04-s003",
      vesselId: "TN-04",
      concept: "ENGINE_RELIABILITY",
      summary: "Engine stopped twice and required restart.",
      status: "OPEN",
      reportedAt: "2026-07-12T05:30:00.000Z",
    };

    expect(isActiveConcern(concern)).toBe(true);
    expect(concern.status).toBe("OPEN");

    const tripContext: TripContext = {
      tripId: "trip-s003-tn04",
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

    expect(tripContext.crewCount).toBe(5);
    expect(tripContext.plannedDurationHours).toBe(8);
    expect(tripContext.tripStatus).toBe("ACTIVE");

    const marineState: MarineRiskState = {
      waveHeightM: 0.8,
      wavePeriodS: null,
      windSpeedKmh: 13,
      windDirectionDeg: null,
      capturedAt: "2026-07-12T06:00:00.000Z",
    };

    expect(marineState.waveHeightM).toBe(0.8);
    expect(marineState.windSpeedKmh).toBe(13);

    const riskState: RiskState = {
      tripContext,
      marineState,
      activeConcerns: [concern],
      posture: "CAUTION",
      lastEvaluatedAt: "2026-07-12T06:00:00.000Z",
      version: 1,
    };

    expect(riskState.posture).toBe("CAUTION");
    expect(isValidRiskStateVersion(riskState.version)).toBe(true);
    expect(riskState.activeConcerns).toHaveLength(1);
    expect(riskState.activeConcerns[0]?.concept).toBe("ENGINE_RELIABILITY");
    expect(riskState.activeConcerns[0]?.status).toBe("OPEN");
    expect(riskState.tripContext.vesselId).toBe("TN-04");
  });
});
