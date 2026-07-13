import { describe, expect, it } from "vitest";
import {
  deserializeRiskState,
  riskStatesAreEquivalent,
  serializeRiskState,
} from "@/application/persistence/risk-state-serialization";
import { PersistenceMappingError } from "@/application/persistence/persistence-errors";
import {
  mapPersistedConcernStatus,
  mapPersistedRiskConcept,
  mapPersistedRiskPosture,
  mapPersistedTripStatus,
  mapPersistedVesselConcern,
} from "@/infrastructure/persistence/prisma/persistence-mappers";
import type { RiskState } from "@/domain/risk";

const VALID_RISK_STATE: RiskState = {
  tripContext: {
    tripId: "trip-1",
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
    capturedAt: "2026-07-13T06:00:00.000Z",
  },
  activeConcerns: [
    {
      id: "concern-1",
      vesselId: "TN-04",
      concept: "ENGINE_RELIABILITY",
      summary: "Engine stopped twice and required restart.",
      status: "OPEN",
      reportedAt: "2026-07-12T05:30:00.000Z",
    },
  ],
  posture: "CAUTION",
  lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
  version: 1,
};

describe("persistence mappers", () => {
  it("rejects unsupported persisted RiskConcept", () => {
    expect(() => mapPersistedRiskConcept("UNKNOWN_CONCEPT", "concept")).toThrow(
      PersistenceMappingError,
    );
  });

  it("rejects unsupported persisted ConcernStatus", () => {
    expect(() => mapPersistedConcernStatus("UNKNOWN_STATUS", "status")).toThrow(
      PersistenceMappingError,
    );
  });

  it("rejects unsupported TripStatus", () => {
    expect(() => mapPersistedTripStatus("UNDERWAY", "status")).toThrow(
      PersistenceMappingError,
    );
  });

  it("rejects unsupported RiskPosture", () => {
    expect(() => mapPersistedRiskPosture("SAFE", "posture")).toThrow(
      PersistenceMappingError,
    );
  });

  it("maps bounded VesselConcern concept and status", () => {
    const concern = mapPersistedVesselConcern({
      id: "concern-1",
      vesselId: "TN-04",
      concept: "ENGINE_RELIABILITY",
      summary: "Engine issue",
      status: "OPEN",
      reportedAt: "2026-07-12T05:30:00.000Z",
      resolutionReportedAt: null,
      resolvedAt: null,
      dismissedAt: null,
    });

    expect(concern.concept).toBe("ENGINE_RELIABILITY");
    expect(concern.status).toBe("OPEN");
  });
});

describe("risk state serialization", () => {
  it("serializes valid RiskState", () => {
    const serialized = serializeRiskState(VALID_RISK_STATE);
    expect(serialized).toMatchObject({
      version: 1,
      posture: "CAUTION",
    });
  });

  it("deserializes valid RiskState", () => {
    const serialized = serializeRiskState(VALID_RISK_STATE);
    const deserialized = deserializeRiskState(serialized);
    expect(deserialized.tripContext.crewCount).toBe(5);
  });

  it("round trip is domain-equivalent", () => {
    const serialized = serializeRiskState(VALID_RISK_STATE);
    const deserialized = deserializeRiskState(serialized);
    expect(riskStatesAreEquivalent(VALID_RISK_STATE, deserialized)).toBe(true);
  });

  it("preserves null marine fields through round trip", () => {
    const serialized = serializeRiskState(VALID_RISK_STATE);
    const deserialized = deserializeRiskState(serialized);
    expect(deserialized.marineState.wavePeriodS).toBeNull();
    expect(deserialized.marineState.windDirectionDeg).toBeNull();
  });

  it("preserves active concerns through round trip", () => {
    const serialized = serializeRiskState(VALID_RISK_STATE);
    const deserialized = deserializeRiskState(serialized);
    expect(deserialized.activeConcerns).toHaveLength(1);
    expect(deserialized.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("rejects version zero during rehydration", () => {
    expect(() =>
      deserializeRiskState({
        ...VALID_RISK_STATE,
        version: 0,
      }),
    ).toThrow(PersistenceMappingError);
  });

  it("rejects negative version during rehydration", () => {
    expect(() =>
      deserializeRiskState({
        ...VALID_RISK_STATE,
        version: -1,
      }),
    ).toThrow(PersistenceMappingError);
  });

  it("rejects malformed stateJson", () => {
    expect(() => deserializeRiskState({ invalid: true })).toThrow(
      PersistenceMappingError,
    );
  });
});
