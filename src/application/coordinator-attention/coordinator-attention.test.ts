import { describe, expect, it } from "vitest";
import { RISK_POSTURES } from "@/domain/risk";
import {
  getRiskPostureAttentionPriority,
  getAttentionGroupFromPosture,
  isAttentionRelevantProcessingTrace,
  findLatestAttentionRelevantTrace,
  findLatestManualCheckAt,
  deriveAttentionBasis,
  sortCoordinatorAttentionTrips,
  buildCoordinatorAttentionSummary,
  type CoordinatorTripAttentionDTO,
} from "@/application/coordinator-attention";
import type { ActiveTripProcessingTraceDto } from "@/application/active-trip";
import type { TimelineEventRecord } from "@/application/persistence/persistence-models";
import { buildProcessingTimelinePayload } from "@/application/risk-orchestrator/processing-timeline-payload";
import {
  appendProcessingTrace,
  buildProcessingResult,
  commsConcernOpen,
  createCoordinatorTestHarness,
  engineConcernOpen,
  resolutionReportedConcern,
  seedTripWithRiskState,
} from "@/test-support/coordinator/coordinator-test-harness";
import { buildS003ValidInterpretationResponse } from "@/test-support/orchestration/orchestration-fixtures";

function makeTrace(
  partial: Partial<ActiveTripProcessingTraceDto>,
): ActiveTripProcessingTraceDto {
  return {
    deltas: partial.deltas ?? [],
    reassessmentDecision: partial.reassessmentDecision ?? {
      required: false,
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
    },
    policyDecision: partial.policyDecision ?? {
      action: "NO_ACTION_REQUIRED",
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
      derivedAt: "2026-07-13T10:00:00.000Z",
    },
    interpretationStatus: partial.interpretationStatus ?? "SKIPPED",
    interpretation: partial.interpretation ?? null,
    previousPosture: partial.previousPosture ?? "CAUTION",
    currentPosture: partial.currentPosture ?? "CAUTION",
    stateSnapshotCreated: partial.stateSnapshotCreated ?? false,
    previousStateVersion: partial.previousStateVersion ?? 1,
    newStateVersion: partial.newStateVersion ?? 1,
  };
}

function makeTripDto(
  partial: Partial<CoordinatorTripAttentionDTO> &
    Pick<CoordinatorTripAttentionDTO, "tripId" | "currentPosture" | "attentionGroup">,
): CoordinatorTripAttentionDTO {
  return {
    vesselId: partial.vesselId ?? partial.tripId,
    tripStatus: "ACTIVE",
    vesselDisplayName: partial.vesselDisplayName ?? partial.tripId,
    registrationReference: null,
    vesselType: "Small fibre boat",
    marineReferenceLocation: {
      latitude: 13.125,
      longitude: 80.3,
      label: "Chennai / Kasimedu",
    },
    crewCount: 5,
    plannedDurationHours: 8,
    startedAt: partial.startedAt ?? "2026-07-13T06:00:00.000Z",
    expectedReturnAt: "2026-07-13T20:00:00.000Z",
    activeConcerns: [],
    stateVersion: 1,
    riskStateRecordedAt: "2026-07-13T06:00:00.000Z",
    latestManualCheckAt: null,
    latestPolicyAction: null,
    attentionBasis: {
      kind: "PERSISTED_STATE",
      currentPosture: partial.currentPosture,
      activeConcernConcepts: [],
      materialDeltas: [],
      reassessmentDecision: null,
      policyAction: null,
      interpretationStatus: null,
      interpretation: null,
      occurredAt: "2026-07-13T06:00:00.000Z",
    },
    latestProcessingInterpretationStatus: null,
    attentionRelevantTraceOccurredAt: partial.attentionRelevantTraceOccurredAt ?? null,
    ...partial,
  };
}

describe("coordinator attention priority", () => {
  it("maps every RiskPosture to a bounded priority", () => {
    for (const posture of RISK_POSTURES) {
      expect(typeof getRiskPostureAttentionPriority(posture)).toBe("number");
    }
  });

  it("ranks OFFICIAL_ALERT_PRIORITY first", () => {
    const priorities = RISK_POSTURES.map(getRiskPostureAttentionPriority);
    expect(getRiskPostureAttentionPriority("OFFICIAL_ALERT_PRIORITY")).toBe(
      Math.min(...priorities),
    );
  });

  it("ranks COORDINATOR_REVIEW_REQUIRED above REASSESSMENT_REQUIRED", () => {
    expect(
      getRiskPostureAttentionPriority("COORDINATOR_REVIEW_REQUIRED"),
    ).toBeLessThan(getRiskPostureAttentionPriority("REASSESSMENT_REQUIRED"));
  });

  it("ranks REASSESSMENT_REQUIRED above CAUTION", () => {
    expect(getRiskPostureAttentionPriority("REASSESSMENT_REQUIRED")).toBeLessThan(
      getRiskPostureAttentionPriority("CAUTION"),
    );
  });

  it("ranks CAUTION above BASELINE", () => {
    expect(getRiskPostureAttentionPriority("CAUTION")).toBeLessThan(
      getRiskPostureAttentionPriority("BASELINE"),
    );
  });
});

describe("coordinator attention classification", () => {
  it("maps alert and review postures to ATTENTION_REQUIRED", () => {
    expect(getAttentionGroupFromPosture("OFFICIAL_ALERT_PRIORITY")).toBe(
      "ATTENTION_REQUIRED",
    );
    expect(getAttentionGroupFromPosture("COORDINATOR_REVIEW_REQUIRED")).toBe(
      "ATTENTION_REQUIRED",
    );
    expect(getAttentionGroupFromPosture("REASSESSMENT_REQUIRED")).toBe(
      "ATTENTION_REQUIRED",
    );
  });

  it("maps CAUTION to WATCH", () => {
    expect(getAttentionGroupFromPosture("CAUTION")).toBe("WATCH");
  });

  it("maps BASELINE to STABLE", () => {
    expect(getAttentionGroupFromPosture("BASELINE")).toBe("STABLE");
  });
});

describe("attention-relevant processing trace", () => {
  it("does not treat NO_ACTION_REQUIRED trace alone as attention relevant", () => {
    expect(
      isAttentionRelevantProcessingTrace(
        makeTrace({
          reassessmentDecision: {
            required: false,
            reason: "NO_MATERIAL_CHANGE",
            triggerConcepts: [],
          },
          policyDecision: {
            action: "NO_ACTION_REQUIRED",
            reason: "NO_MATERIAL_CHANGE",
            triggerConcepts: [],
            derivedAt: "2026-07-13T10:00:00.000Z",
          },
          previousPosture: "REASSESSMENT_REQUIRED",
          currentPosture: "REASSESSMENT_REQUIRED",
        }),
      ),
    ).toBe(false);
  });

  it("treats required reassessment trace as attention relevant", () => {
    expect(
      isAttentionRelevantProcessingTrace(
        makeTrace({
          reassessmentDecision: {
            required: true,
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
            triggerConcepts: ["WAVE_CONDITIONS"],
          },
        }),
      ),
    ).toBe(true);
  });

  it("treats non-NO_ACTION_REQUIRED policy trace as attention relevant", () => {
    expect(
      isAttentionRelevantProcessingTrace(
        makeTrace({
          policyDecision: {
            action: "COORDINATOR_REVIEW_REQUIRED",
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["ENGINE_RELIABILITY"],
            derivedAt: "2026-07-13T10:00:00.000Z",
          },
        }),
      ),
    ).toBe(true);
  });

  it("treats posture-change trace as attention relevant", () => {
    expect(
      isAttentionRelevantProcessingTrace(
        makeTrace({
          previousPosture: "CAUTION",
          currentPosture: "REASSESSMENT_REQUIRED",
        }),
      ),
    ).toBe(true);
  });
});

describe("attention basis selection", () => {
  const events: TimelineEventRecord[] = [
    {
      id: "evt-older",
      tripId: "trip-1",
      type: "RISK_EVENT_PROCESSED",
      occurredAt: "2026-07-13T08:00:00.000Z",
      createdAt: "2026-07-13T08:00:00.000Z",
      payload: buildProcessingTimelinePayload(
        buildProcessingResult({
          eventId: "evt-older-src",
          processedAt: "2026-07-13T08:00:00.000Z",
          currentPosture: "COORDINATOR_REVIEW_REQUIRED",
          policyDecision: {
            action: "COORDINATOR_REVIEW_REQUIRED",
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["ENGINE_RELIABILITY"],
            derivedAt: "2026-07-13T08:00:00.000Z",
          },
          reassessmentDecision: {
            required: true,
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["ENGINE_RELIABILITY"],
          },
        }),
      ),
    },
    {
      id: "evt-latest",
      tripId: "trip-1",
      type: "RISK_EVENT_PROCESSED",
      occurredAt: "2026-07-13T10:00:00.000Z",
      createdAt: "2026-07-13T10:00:00.000Z",
      payload: buildProcessingTimelinePayload(
        buildProcessingResult({
          eventId: "evt-latest-src",
          processedAt: "2026-07-13T10:00:00.000Z",
          currentPosture: "COORDINATOR_REVIEW_REQUIRED",
          previousPosture: "COORDINATOR_REVIEW_REQUIRED",
        }),
      ),
    },
  ];

  it("selects latest attention-relevant trace", () => {
    const selected = findLatestAttentionRelevantTrace(events);
    expect(selected?.eventId).toBe("evt-older");
  });

  it("uses latest processing event for manual check even when irrelevant", () => {
    expect(findLatestManualCheckAt(events)).toBe("2026-07-13T10:00:00.000Z");
  });

  it("derives PERSISTED_STATE basis without fabricated deltas or policy", () => {
    const basis = deriveAttentionBasis({
      currentPosture: "REASSESSMENT_REQUIRED",
      activeConcerns: [commsConcernOpen()],
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
      attentionRelevantTrace: null,
    });

    expect(basis.kind).toBe("PERSISTED_STATE");
    expect(basis.materialDeltas).toEqual([]);
    expect(basis.policyAction).toBeNull();
    expect(basis.interpretation).toBeNull();
    expect(basis.interpretationStatus).toBeNull();
  });

  it("preserves validated processing trace fields for PROCESSING_TRACE basis", () => {
    const relevant = findLatestAttentionRelevantTrace(events)!;
    const basis = deriveAttentionBasis({
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      activeConcerns: [engineConcernOpen()],
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
      attentionRelevantTrace: relevant,
    });

    expect(basis.kind).toBe("PROCESSING_TRACE");
    expect(basis.reassessmentDecision?.required).toBe(true);
    expect(basis.policyAction).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(basis.occurredAt).toBe("2026-07-13T08:00:00.000Z");
  });
});

describe("coordinator attention sorting", () => {
  it("sorts by posture priority, relevant trace time, startedAt, then tripId", () => {
    const trips = [
      makeTripDto({
        tripId: "trip-b",
        currentPosture: "REASSESSMENT_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        startedAt: "2026-07-13T08:00:00.000Z",
        attentionRelevantTraceOccurredAt: null,
      }),
      makeTripDto({
        tripId: "trip-a",
        currentPosture: "REASSESSMENT_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        startedAt: "2026-07-13T06:00:00.000Z",
        attentionRelevantTraceOccurredAt: null,
      }),
      makeTripDto({
        tripId: "trip-c",
        currentPosture: "COORDINATOR_REVIEW_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        startedAt: "2026-07-13T09:00:00.000Z",
        attentionRelevantTraceOccurredAt: "2026-07-13T11:00:00.000Z",
      }),
      makeTripDto({
        tripId: "trip-d",
        currentPosture: "CAUTION",
        attentionGroup: "WATCH",
        startedAt: "2026-07-13T05:00:00.000Z",
      }),
      makeTripDto({
        tripId: "trip-e",
        currentPosture: "BASELINE",
        attentionGroup: "STABLE",
        startedAt: "2026-07-13T04:00:00.000Z",
      }),
    ];

    const sorted = sortCoordinatorAttentionTrips(trips).map((trip) => trip.tripId);
    expect(sorted).toEqual(["trip-c", "trip-a", "trip-b", "trip-d", "trip-e"]);
  });
});

describe("coordinator attention service integration", () => {
  it("projects multi-trip coordinator attention deterministically", async () => {
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
          triggerConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
        },
        policyDecision: {
          action: "COORDINATOR_REVIEW_REQUIRED",
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
          triggerConcepts: ["ENGINE_RELIABILITY"],
          derivedAt: "2026-07-13T09:00:00.000Z",
        },
        deltas: [
          {
            id: "delta-wave",
            type: "VALUE_INCREASED",
            concept: "WAVE_CONDITIONS",
            previousValue: 0.8,
            currentValue: 1.5,
            absoluteChange: 0.7,
            reassessmentRelevant: true,
            detectedAt: "2026-07-13T09:00:00.000Z",
            measurement: "WAVE_HEIGHT_M",
          },
        ],
        interpretationStatus: "SUCCEEDED",
        interpretation: buildS003ValidInterpretationResponse(),
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
        interpretationStatus: "SKIPPED",
      }),
      "2026-07-13T10:00:00.000Z",
      "timeline-tn07",
    );

    await seedTripWithRiskState({
      harness,
      tripId: "trip-tn12",
      vesselId: "vessel-tn12",
      displayName: "TN-12",
      posture: "CAUTION",
      startedAt: "2026-07-13T08:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T08:00:00.000Z",
    });

    await seedTripWithRiskState({
      harness,
      tripId: "trip-tn18",
      vesselId: "vessel-tn18",
      displayName: "TN-18",
      posture: "BASELINE",
      startedAt: "2026-07-13T09:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
    });

    const result = await harness.service.getCoordinatorAttention();
    const orderedIds = [
      ...result.attentionRequired,
      ...result.watch,
      ...result.stable,
    ].map((trip) => trip.vesselDisplayName);

    expect(orderedIds).toEqual(["TN-04", "TN-07", "TN-12", "TN-18"]);
    expect(result.attentionRequired.map((trip) => trip.vesselDisplayName)).toEqual([
      "TN-04",
      "TN-07",
    ]);
    expect(result.watch.map((trip) => trip.vesselDisplayName)).toEqual(["TN-12"]);
    expect(result.stable.map((trip) => trip.vesselDisplayName)).toEqual(["TN-18"]);

    const tn04 = result.attentionRequired[0]!;
    expect(tn04.attentionBasis.kind).toBe("PROCESSING_TRACE");

    const tn07 = result.attentionRequired[1]!;
    expect(tn07.attentionBasis.kind).toBe("PERSISTED_STATE");
    expect(tn07.latestPolicyAction).toBe("NO_ACTION_REQUIRED");
    expect(tn07.attentionBasis.policyAction).toBeNull();

    expect(result.summary.totalActiveTrips).toBe(4);
    expect(result.summary.attentionRequiredCount).toBe(2);
    expect(result.summary.watchCount).toBe(1);
    expect(result.summary.stableCount).toBe(1);
  });

  it("preserves RESOLUTION_REPORTED as active concern context", async () => {
    const harness = createCoordinatorTestHarness();
    await seedTripWithRiskState({
      harness,
      tripId: "trip-resolution",
      vesselId: "vessel-resolution",
      displayName: "TN-RES",
      posture: "REASSESSMENT_REQUIRED",
      activeConcerns: [resolutionReportedConcern()],
      startedAt: "2026-07-13T06:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
    });

    const result = await harness.service.getCoordinatorAttention();
    expect(result.attentionRequired[0]?.activeConcerns[0]?.status).toBe(
      "RESOLUTION_REPORTED",
    );
  });

  it("does not display resolved concerns absent from latest risk state", async () => {
    const harness = createCoordinatorTestHarness();
    await seedTripWithRiskState({
      harness,
      tripId: "trip-resolved-absent",
      vesselId: "vessel-resolved",
      displayName: "TN-RESOLVED",
      posture: "BASELINE",
      activeConcerns: [],
      startedAt: "2026-07-13T06:00:00.000Z",
      lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
    });

    const result = await harness.service.getCoordinatorAttention();
    expect(result.stable[0]?.activeConcerns).toEqual([]);
  });
});

describe("coordinator summary counts", () => {
  it("counts trips in exactly one attention group", () => {
    const trips = [
      makeTripDto({
        tripId: "trip-1",
        currentPosture: "REASSESSMENT_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        latestManualCheckAt: null,
      }),
      makeTripDto({
        tripId: "trip-2",
        currentPosture: "CAUTION",
        attentionGroup: "WATCH",
        latestManualCheckAt: "2026-07-13T10:00:00.000Z",
      }),
    ];

    const summary = buildCoordinatorAttentionSummary(trips);
    expect(summary.totalActiveTrips).toBe(2);
    expect(summary.attentionRequiredCount).toBe(1);
    expect(summary.watchCount).toBe(1);
    expect(summary.notCheckedYetCount).toBe(1);
  });
});
