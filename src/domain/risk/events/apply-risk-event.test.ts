import { describe, expect, it } from "vitest";
import { RISK_EVENT_TYPES, isRiskEventType } from "./risk-event-types";
import type { MarineStateUpdatedEvent } from "./risk-event";
import { applyRiskEvent, RiskEventTripMismatchError } from "./apply-risk-event";
import type { RiskState } from "../risk-state";

const baseState: RiskState = {
  tripContext: {
    tripId: "trip-001",
    vesselId: "TN-04",
    crewCount: 5,
    plannedDurationHours: 8,
    tripStatus: "ACTIVE",
  },
  marineState: {
    waveHeightM: 0.8,
    wavePeriodS: null,
    windSpeedKmh: 13,
    windDirectionDeg: null,
    capturedAt: "2026-07-13T05:55:00.000Z",
  },
  activeConcerns: [
    {
      id: "concern-engine",
      vesselId: "TN-04",
      concept: "ENGINE_RELIABILITY",
      summary: "Engine stopped twice.",
      status: "OPEN",
      reportedAt: "2026-07-12T05:30:00.000Z",
    },
  ],
  posture: "CAUTION",
  lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
  version: 1,
};

const marineEvent: MarineStateUpdatedEvent = {
  id: "evt-marine-001",
  tripId: "trip-001",
  type: "MARINE_STATE_UPDATED",
  occurredAt: "2026-07-13T07:00:00.000Z",
  marineState: {
    waveHeightM: 1.5,
    wavePeriodS: null,
    windSpeedKmh: 18,
    windDirectionDeg: null,
    capturedAt: "2026-07-13T06:55:00.000Z",
  },
};

describe("RiskEventType vocabulary", () => {
  it("contains exactly MARINE_STATE_UPDATED", () => {
    expect(RISK_EVENT_TYPES).toEqual(["MARINE_STATE_UPDATED"]);
    expect(isRiskEventType("MARINE_STATE_UPDATED")).toBe(true);
    expect(isRiskEventType("GPS_UPDATED")).toBe(false);
  });
});

describe("MarineStateUpdatedEvent", () => {
  it("is provider independent and contains normalized marine state only", () => {
    expect(marineEvent.type).toBe("MARINE_STATE_UPDATED");
    expect(marineEvent).not.toHaveProperty("marineContext");
    expect(marineEvent).not.toHaveProperty("rawOpenMeteo");
    expect(marineEvent).not.toHaveProperty("riskDeltas");
    expect(marineEvent).not.toHaveProperty("policyDecision");
    expect(marineEvent.marineState.waveHeightM).toBe(1.5);
  });
});

describe("applyRiskEvent", () => {
  it("replaces marine state while preserving trip context, concerns, posture, version, and lastEvaluatedAt", () => {
    const candidate = applyRiskEvent(baseState, marineEvent);

    expect(candidate.marineState).toEqual(marineEvent.marineState);
    expect(candidate.tripContext).toEqual(baseState.tripContext);
    expect(candidate.activeConcerns).toEqual(baseState.activeConcerns);
    expect(candidate.posture).toBe("CAUTION");
    expect(candidate.version).toBe(1);
    expect(candidate.lastEvaluatedAt).toBe(baseState.lastEvaluatedAt);
  });

  it("does not mutate the previous state", () => {
    const previousCopy = JSON.parse(JSON.stringify(baseState));
    applyRiskEvent(baseState, marineEvent);
    expect(baseState).toEqual(previousCopy);
  });

  it("fails closed on trip mismatch", () => {
    expect(() =>
      applyRiskEvent(baseState, { ...marineEvent, tripId: "trip-other" }),
    ).toThrow(RiskEventTripMismatchError);
  });
});
