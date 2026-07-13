import { describe, expect, it } from "vitest";
import {
  VesselRiskRecordService,
  type VesselRiskRecordRepositories,
} from "@/application/vessel-risk-record";
import {
  ConcernTransitionError,
  PersistenceConflictError,
  riskStatesAreEquivalent,
} from "@/application/persistence";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import { TEST_MARINE_REFERENCE } from "@/test-support/persistence/test-marine-reference";

const DAY1_CREATED_AT = "2026-07-12T05:00:00.000Z";
const DAY1_UPDATED_AT = "2026-07-12T05:00:00.000Z";
const DAY1_REPORTED_AT = "2026-07-12T05:30:00.000Z";
const DAY2_CREATED_AT = "2026-07-13T06:00:00.000Z";
const DAY2_UPDATED_AT = "2026-07-13T06:00:00.000Z";
const DAY2_EVALUATED_AT = "2026-07-13T06:00:00.000Z";
const DAY2_MARINE_CAPTURED_AT = "2026-07-13T05:55:00.000Z";

function createService(): {
  service: VesselRiskRecordService;
  repos: VesselRiskRecordRepositories;
} {
  const repos = createInMemoryPersistenceRepositories();
  return {
    service: new VesselRiskRecordService(repos),
    repos,
  };
}

describe("VesselRiskRecordService", () => {
  it("creates vessel with nullable registrationReference", async () => {
    const { service } = createService();
    const vessel = await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    expect(vessel.id).toBe("TN-04");
    expect(vessel.registrationReference).toBeNull();
  });

  it("reports OPEN vessel concern", async () => {
    const { service } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const concern = await service.reportVesselConcern(
      {
        id: "concern-engine-tn04",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice and required restart.",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    expect(concern.status).toBe("OPEN");
  });

  it("loads active OPEN and RESOLUTION_REPORTED concerns and excludes inactive ones", async () => {
    const { service } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-open",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Open concern",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-resolution-reported",
        vesselId: "TN-04",
        concept: "PRIMARY_COMMUNICATION",
        summary: "Resolution reported concern",
        status: "RESOLUTION_REPORTED",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-resolved",
        vesselId: "TN-04",
        concept: "HULL_INTEGRITY",
        summary: "Resolved concern",
        status: "RESOLVED",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-dismissed",
        vesselId: "TN-04",
        concept: "SAFETY_EQUIPMENT",
        summary: "Dismissed concern",
        status: "DISMISSED",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const active = await service.loadActiveVesselConcerns("TN-04");
    expect(active.map((concern) => concern.id)).toEqual([
      "concern-open",
      "concern-resolution-reported",
    ]);
  });

  it("uses canTransitionConcernStatus and sets lifecycle timestamps", async () => {
    const { service } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-lifecycle",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Lifecycle concern",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const resolutionReported = await service.updateConcernStatus(
      "concern-lifecycle",
      "RESOLUTION_REPORTED",
      {
        updatedAt: "2026-07-12T06:00:00.000Z",
        lifecycleAt: "2026-07-12T06:00:00.000Z",
      },
    );
    expect(resolutionReported.resolutionReportedAt).toBe("2026-07-12T06:00:00.000Z");

    const resolved = await service.updateConcernStatus("concern-lifecycle", "RESOLVED", {
      updatedAt: "2026-07-12T07:00:00.000Z",
      lifecycleAt: "2026-07-12T07:00:00.000Z",
    });
    expect(resolved.resolvedAt).toBe("2026-07-12T07:00:00.000Z");

    const reopened = await service.updateConcernStatus("concern-lifecycle", "OPEN", {
      updatedAt: "2026-07-12T08:00:00.000Z",
      lifecycleAt: "2026-07-12T08:00:00.000Z",
    });
    expect(reopened.reportedAt).toBe(DAY1_REPORTED_AT);
    expect(reopened.resolutionReportedAt).toBeUndefined();
    expect(reopened.resolvedAt).toBeUndefined();

    const dismissed = await service.updateConcernStatus("concern-lifecycle", "DISMISSED", {
      updatedAt: "2026-07-12T09:00:00.000Z",
      lifecycleAt: "2026-07-12T09:00:00.000Z",
    });
    expect(dismissed.dismissedAt).toBe("2026-07-12T09:00:00.000Z");

    await expect(
      service.updateConcernStatus("concern-lifecycle", "RESOLVED", {
        updatedAt: "2026-07-12T10:00:00.000Z",
        lifecycleAt: "2026-07-12T10:00:00.000Z",
      }),
    ).rejects.toThrow(ConcernTransitionError);
  });

  it("persists trip and initial risk state with active concern carry-forward", async () => {
    const { service, repos } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-open",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Open concern",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-resolved",
        vesselId: "TN-04",
        concept: "HULL_INTEGRITY",
        summary: "Resolved concern",
        status: "RESOLVED",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const trip = await service.createTrip(
      {
        id: "trip-tn04-day2",
        vesselId: "TN-04",
        crewCount: 5,
        plannedDurationHours: 8,
        status: "ACTIVE",
        ...TEST_MARINE_REFERENCE,
      },
      { createdAt: DAY2_CREATED_AT, updatedAt: DAY2_UPDATED_AT },
      {
        eventId: "timeline-trip-created",
        occurredAt: DAY2_CREATED_AT,
        eventCreatedAt: DAY2_CREATED_AT,
      },
    );

    expect(trip.crewCount).toBe(5);

    const initial = await service.createInitialTripRiskState({
      tripId: trip.id,
      marineState: {
        waveHeightM: 0.8,
        wavePeriodS: null,
        windSpeedKmh: 13,
        windDirectionDeg: null,
        capturedAt: DAY2_MARINE_CAPTURED_AT,
      },
      posture: "CAUTION",
      lastEvaluatedAt: DAY2_EVALUATED_AT,
      snapshotId: "snapshot-v1",
      snapshotCreatedAt: DAY2_CREATED_AT,
      timelineOccurredAt: DAY2_CREATED_AT,
      timelineCreatedAt: DAY2_CREATED_AT,
    });

    expect(initial.riskState.version).toBe(1);
    expect(initial.riskState.activeConcerns).toHaveLength(1);
    expect(initial.riskState.activeConcerns[0]?.concept).toBe("ENGINE_RELIABILITY");

    const latest = await service.loadLatestTripRiskState(trip.id);
    expect(latest).not.toBeNull();
    expect(riskStatesAreEquivalent(initial.riskState, latest!.riskState)).toBe(true);

    await expect(
      repos.riskStates.create({
        id: "snapshot-v1-duplicate",
        tripId: trip.id,
        version: 1,
        posture: "CAUTION",
        stateJson: initial.snapshot.stateJson,
        lastEvaluatedAt: DAY2_EVALUATED_AT,
        createdAt: DAY2_CREATED_AT,
      }),
    ).rejects.toThrow(PersistenceConflictError);
  });

  it("keeps historical snapshot OPEN after current concern becomes RESOLVED", async () => {
    const { service } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-engine-tn04",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice and required restart.",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const trip = await service.createTrip(
      {
        id: "trip-tn04-day2",
        vesselId: "TN-04",
        crewCount: 5,
        plannedDurationHours: 8,
        status: "ACTIVE",
        ...TEST_MARINE_REFERENCE,
      },
      { createdAt: DAY2_CREATED_AT, updatedAt: DAY2_UPDATED_AT },
      {
        eventId: "timeline-trip-created",
        occurredAt: DAY2_CREATED_AT,
        eventCreatedAt: DAY2_CREATED_AT,
      },
    );

    await service.createInitialTripRiskState({
      tripId: trip.id,
      marineState: {
        waveHeightM: 0.8,
        wavePeriodS: null,
        windSpeedKmh: 13,
        windDirectionDeg: null,
        capturedAt: DAY2_MARINE_CAPTURED_AT,
      },
      posture: "CAUTION",
      lastEvaluatedAt: DAY2_EVALUATED_AT,
      snapshotId: "snapshot-v1",
      snapshotCreatedAt: DAY2_CREATED_AT,
      timelineOccurredAt: DAY2_CREATED_AT,
      timelineCreatedAt: DAY2_CREATED_AT,
    });

    await service.updateConcernStatus("concern-engine-tn04", "RESOLVED", {
      updatedAt: "2026-07-13T12:00:00.000Z",
      lifecycleAt: "2026-07-13T12:00:00.000Z",
    });

    const historical = await service.loadTripRiskStateByVersion(trip.id, 1);
    expect(historical?.riskState.activeConcerns[0]?.status).toBe("OPEN");
  });

  it("persists timeline events with deterministic ordering and no updates", async () => {
    const { service, repos } = createService();
    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const trip = await service.createTrip(
      {
        id: "trip-timeline",
        vesselId: "TN-04",
        crewCount: 5,
        plannedDurationHours: 8,
        status: "PLANNED",
        ...TEST_MARINE_REFERENCE,
      },
      { createdAt: DAY2_CREATED_AT, updatedAt: DAY2_UPDATED_AT },
      {
        eventId: "timeline-trip-created",
        occurredAt: DAY2_CREATED_AT,
        eventCreatedAt: DAY2_CREATED_AT,
      },
    );

    const appended = await service.appendTimelineEvent({
      id: "timeline-custom",
      tripId: trip.id,
      type: "RISK_STATE_SNAPSHOT_CREATED",
      payload: { version: 1 },
      occurredAt: "2026-07-13T07:00:00.000Z",
      createdAt: "2026-07-13T07:00:00.000Z",
    });

    expect(appended.payload).toEqual({ version: 1 });

    const events = await repos.timeline.findByTripId(trip.id);
    expect(events.map((event) => event.id)).toEqual([
      "timeline-trip-created",
      "timeline-custom",
    ]);

    expect(typeof (repos.timeline as { update?: unknown }).update).toBe("undefined");
  });
});

describe("S003 persistence workflow", () => {
  it("Day 1 concern persists and Day 2 trip loads ENGINE_RELIABILITY OPEN", async () => {
    const { service } = createService();

    await service.createVessel(
      {
        id: "TN-04",
        displayName: "TN-04",
        vesselType: "fiberglass",
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    await service.reportVesselConcern(
      {
        id: "concern-engine-tn04-s003",
        vesselId: "TN-04",
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice and required restart.",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );

    const trip = await service.createTrip(
      {
        id: "trip-tn04-s003-day2",
        vesselId: "TN-04",
        crewCount: 5,
        plannedDurationHours: 8,
        status: "ACTIVE",
        ...TEST_MARINE_REFERENCE,
      },
      { createdAt: DAY2_CREATED_AT, updatedAt: DAY2_UPDATED_AT },
      {
        eventId: "timeline-s003-trip-created",
        occurredAt: DAY2_CREATED_AT,
        eventCreatedAt: DAY2_CREATED_AT,
      },
    );

    const initial = await service.createInitialTripRiskState({
      tripId: trip.id,
      marineState: {
        waveHeightM: 0.8,
        wavePeriodS: null,
        windSpeedKmh: 13,
        windDirectionDeg: null,
        capturedAt: DAY2_MARINE_CAPTURED_AT,
      },
      posture: "CAUTION",
      lastEvaluatedAt: DAY2_EVALUATED_AT,
      snapshotId: "snapshot-s003-v1",
      snapshotCreatedAt: DAY2_CREATED_AT,
      timelineOccurredAt: DAY2_CREATED_AT,
      timelineCreatedAt: DAY2_CREATED_AT,
    });

    expect(initial.riskState.activeConcerns[0]?.concept).toBe("ENGINE_RELIABILITY");
    expect(initial.riskState.activeConcerns[0]?.status).toBe("OPEN");
    expect(initial.riskState.tripContext.crewCount).toBe(5);
    expect(initial.riskState.tripContext.plannedDurationHours).toBe(8);
    expect(initial.riskState.marineState.waveHeightM).toBe(0.8);
    expect(initial.riskState.marineState.windSpeedKmh).toBe(13);
    expect(initial.riskState.posture).toBe("CAUTION");

    const latest = await service.loadLatestTripRiskState(trip.id);
    expect(riskStatesAreEquivalent(initial.riskState, latest!.riskState)).toBe(true);

    await service.updateConcernStatus("concern-engine-tn04-s003", "RESOLVED", {
      updatedAt: "2026-07-13T12:00:00.000Z",
      lifecycleAt: "2026-07-13T12:00:00.000Z",
    });

    const historical = await service.loadTripRiskStateByVersion(trip.id, 1);
    expect(historical?.riskState.activeConcerns[0]?.status).toBe("OPEN");
  });
});

describe("persistence test isolation", () => {
  it("does not call real Neon or Gemini", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.GEMINI_API_KEY).toBeUndefined();
  });
});
