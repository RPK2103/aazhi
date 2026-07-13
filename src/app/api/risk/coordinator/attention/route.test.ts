import { describe, expect, it } from "vitest";
import { createCoordinatorAttentionHandler } from "@/app/api/risk/coordinator/attention/coordinator-attention-handler";
import {
  appendProcessingTrace,
  buildProcessingResult,
  commsConcernOpen,
  createCoordinatorTestHarness,
  engineConcernOpen,
  seedTripWithRiskState,
} from "@/test-support/coordinator/coordinator-test-harness";
import { buildS003ValidInterpretationResponse } from "@/test-support/orchestration/orchestration-fixtures";

describe("GET /api/risk/coordinator/attention", () => {
  it("returns UI-safe CoordinatorAttentionDTO for active trips only", async () => {
    const harness = createCoordinatorTestHarness();

    await seedTripWithRiskState({
      harness,
      tripId: "trip-active",
      vesselId: "vessel-active",
      displayName: "TN-04",
      posture: "COORDINATOR_REVIEW_REQUIRED",
      activeConcerns: [engineConcernOpen()],
      startedAt: "2026-07-13T06:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
      version: 2,
    });

    await appendProcessingTrace(
      harness,
      "trip-active",
      buildProcessingResult({
        eventId: "evt-active",
        processedAt: "2026-07-13T09:00:00.000Z",
        currentPosture: "COORDINATOR_REVIEW_REQUIRED",
        previousPosture: "CAUTION",
        reassessmentDecision: {
          required: true,
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
          triggerConcepts: ["ENGINE_RELIABILITY"],
        },
        policyDecision: {
          action: "COORDINATOR_REVIEW_REQUIRED",
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
          triggerConcepts: ["ENGINE_RELIABILITY"],
          derivedAt: "2026-07-13T09:00:00.000Z",
        },
        interpretationStatus: "SUCCEEDED",
        interpretation: buildS003ValidInterpretationResponse(),
      }),
      "2026-07-13T09:00:00.000Z",
      "timeline-active",
    );

    await harness.repos.trips.create(
      {
        id: "trip-completed",
        vesselId: "vessel-active",
        crewCount: 4,
        plannedDurationHours: 6,
        status: "COMPLETED",
        startedAt: "2026-07-12T06:00:00.000Z",
        expectedReturnAt: "2026-07-12T14:00:00.000Z",
        endedAt: "2026-07-12T14:00:00.000Z",
        marineReferenceLatitude: 13.125,
        marineReferenceLongitude: 80.3,
        marineReferenceLabel: "Chennai / Kasimedu",
      },
      {
        createdAt: "2026-07-12T06:00:00.000Z",
        updatedAt: "2026-07-12T14:00:00.000Z",
      },
    );

    const GET = createCoordinatorAttentionHandler(harness.service);
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.summary.totalActiveTrips).toBe(1);
    expect(body.attentionRequired).toHaveLength(1);
    expect(body.attentionRequired[0].vesselDisplayName).toBe("TN-04");
    expect(body.manualMonitoringNotice).toContain("not continuously monitoring");
  });

  it("fails closed on malformed processing payload", async () => {
    const harness = createCoordinatorTestHarness();
    await seedTripWithRiskState({
      harness,
      tripId: "trip-malformed",
      vesselId: "vessel-malformed",
      displayName: "TN-BAD",
      posture: "CAUTION",
      startedAt: "2026-07-13T06:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
    });

    await harness.repos.timeline.append({
      id: "bad-trace",
      tripId: "trip-malformed",
      type: "RISK_EVENT_PROCESSED",
      payload: { invalid: true },
      occurredAt: "2026-07-13T08:00:00.000Z",
      createdAt: "2026-07-13T08:00:00.000Z",
    });

    const GET = createCoordinatorAttentionHandler(harness.service);
    const response = await GET();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("TIMELINE_VALIDATION_FAILED");
  });

  it("returns deterministic ordering for TN-04 and TN-07 scenario", async () => {
    const harness = createCoordinatorTestHarness();

    await seedTripWithRiskState({
      harness,
      tripId: "trip-tn04",
      vesselId: "vessel-tn04",
      displayName: "TN-04",
      posture: "COORDINATOR_REVIEW_REQUIRED",
      activeConcerns: [engineConcernOpen()],
      startedAt: "2026-07-13T06:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
      version: 2,
    });

    await appendProcessingTrace(
      harness,
      "trip-tn04",
      buildProcessingResult({
        eventId: "evt-tn04",
        processedAt: "2026-07-13T09:00:00.000Z",
        currentPosture: "COORDINATOR_REVIEW_REQUIRED",
        previousPosture: "CAUTION",
        reassessmentDecision: {
          required: true,
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
          triggerConcepts: ["ENGINE_RELIABILITY"],
        },
        policyDecision: {
          action: "COORDINATOR_REVIEW_REQUIRED",
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
          triggerConcepts: ["ENGINE_RELIABILITY"],
          derivedAt: "2026-07-13T09:00:00.000Z",
        },
      }),
      "2026-07-13T09:00:00.000Z",
      "timeline-tn04",
    );

    await seedTripWithRiskState({
      harness,
      tripId: "trip-tn07",
      vesselId: "vessel-tn07",
      displayName: "TN-07",
      posture: "REASSESSMENT_REQUIRED",
      activeConcerns: [commsConcernOpen()],
      startedAt: "2026-07-13T07:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T10:00:00.000Z",
      version: 2,
    });

    await appendProcessingTrace(
      harness,
      "trip-tn07",
      buildProcessingResult({
        eventId: "evt-tn07",
        processedAt: "2026-07-13T10:00:00.000Z",
        currentPosture: "REASSESSMENT_REQUIRED",
        previousPosture: "REASSESSMENT_REQUIRED",
      }),
      "2026-07-13T10:00:00.000Z",
      "timeline-tn07",
    );

    const GET = createCoordinatorAttentionHandler(harness.service);
    const body = await (await GET()).json();
    const ordered = [
      ...body.attentionRequired,
      ...body.watch,
      ...body.stable,
    ].map((trip: { vesselDisplayName: string }) => trip.vesselDisplayName);

    expect(ordered).toEqual(["TN-04", "TN-07"]);
    expect(body.attentionRequired[1].attentionBasis.kind).toBe("PERSISTED_STATE");
    expect(body.attentionRequired[1].latestPolicyAction).toBe("NO_ACTION_REQUIRED");
    expect(body.attentionRequired[1].attentionBasis.policyAction).toBeNull();
  });

  it("fails closed when active trip has no risk state", async () => {
    const harness = createCoordinatorTestHarness();
    await harness.repos.trips.create(
      {
        id: "trip-no-state",
        vesselId: "vessel-no-state",
        crewCount: 4,
        plannedDurationHours: 6,
        status: "ACTIVE",
        startedAt: "2026-07-13T06:00:00.000Z",
        expectedReturnAt: "2026-07-13T14:00:00.000Z",
        marineReferenceLatitude: 13.125,
        marineReferenceLongitude: 80.3,
        marineReferenceLabel: "Chennai / Kasimedu",
      },
      {
        createdAt: "2026-07-13T06:00:00.000Z",
        updatedAt: "2026-07-13T06:00:00.000Z",
      },
    );
    await harness.repos.vessels.create(
      {
        id: "vessel-no-state",
        displayName: "TN-NO-STATE",
        vesselType: "fiberglass",
      },
      {
        createdAt: "2026-07-13T06:00:00.000Z",
        updatedAt: "2026-07-13T06:00:00.000Z",
      },
    );

    const GET = createCoordinatorAttentionHandler(harness.service);
    const response = await GET();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("INCOMPLETE_TRIP_STATE");
  });
});
