import { describe, expect, it } from "vitest";
import { PersistenceMappingError } from "@/application/persistence/persistence-errors";
import {
  mapLoadedTripRiskState,
  mapPersistedTimelineEvent,
  mapPersistedTrip,
  mapPersistedTripRiskStateSnapshot,
  mapPersistedTripStatus,
  mapPersistedVessel,
} from "@/infrastructure/persistence/prisma/persistence-mappers";

describe("Prisma persistence mappers", () => {
  it("maps persisted vessel including null registrationReference", () => {
    const vessel = mapPersistedVessel({
      id: "TN-04",
      displayName: "TN-04",
      registrationReference: null,
      vesselType: "fiberglass",
      createdAt: "2026-07-12T05:00:00.000Z",
      updatedAt: "2026-07-12T05:00:00.000Z",
    });

    expect(vessel.registrationReference).toBeNull();
  });

  it("rehydrates trip status from bounded vocabulary", () => {
    const trip = mapPersistedTrip({
      id: "trip-1",
      vesselId: "TN-04",
      crewCount: 5,
      plannedDurationHours: 8,
      status: "ACTIVE",
      marineReferenceLatitude: 13.125,
      marineReferenceLongitude: 80.3,
      marineReferenceLabel: "Chennai / Kasimedu",
      startedAt: null,
      expectedReturnAt: null,
      endedAt: null,
      createdAt: "2026-07-13T06:00:00.000Z",
      updatedAt: "2026-07-13T06:00:00.000Z",
    });

    expect(trip.status).toBe("ACTIVE");
  });

  it("rejects unsupported trip status during rehydration", () => {
    expect(() =>
      mapPersistedTripStatus("UNDERWAY", "status"),
    ).toThrow(PersistenceMappingError);
  });

  it("maps trip risk state snapshot metadata", () => {
    const snapshot = mapPersistedTripRiskStateSnapshot({
      id: "snapshot-1",
      tripId: "trip-1",
      version: 1,
      posture: "CAUTION",
      stateJson: {
        tripContext: {
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
        },
        marineState: {
          waveHeightM: 0.8,
          wavePeriodS: null,
          windSpeedKmh: 13,
          windDirectionDeg: null,
          capturedAt: "2026-07-13T05:55:00.000Z",
        },
        activeConcerns: [],
        posture: "CAUTION",
        lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
        version: 1,
      },
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
      createdAt: "2026-07-13T06:00:00.000Z",
    });

    expect(snapshot.version).toBe(1);
  });

  it("loads trip risk state from snapshot json", () => {
    const loaded = mapLoadedTripRiskState({
      id: "snapshot-1",
      tripId: "trip-1",
      version: 1,
      posture: "CAUTION",
      stateJson: {
        tripContext: {
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
            id: "concern-1",
            vesselId: "TN-04",
            concept: "ENGINE_RELIABILITY",
            summary: "Engine issue",
            status: "OPEN",
            reportedAt: "2026-07-12T05:30:00.000Z",
          },
        ],
        posture: "CAUTION",
        lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
        version: 1,
      },
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
      createdAt: "2026-07-13T06:00:00.000Z",
    });

    expect(loaded.riskState.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("maps timeline event payload", () => {
    const event = mapPersistedTimelineEvent({
      id: "event-1",
      tripId: "trip-1",
      type: "TRIP_CREATED",
      payload: { vesselId: "TN-04" },
      occurredAt: "2026-07-13T06:00:00.000Z",
      createdAt: "2026-07-13T06:00:00.000Z",
    });

    expect(event.payload).toEqual({ vesselId: "TN-04" });
  });
});
