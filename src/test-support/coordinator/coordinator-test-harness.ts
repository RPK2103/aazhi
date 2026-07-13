import type { RiskPosture, VesselConcern } from "@/domain/risk";
import type { RiskEventProcessingResult } from "@/application/risk-orchestrator";
import { buildProcessingTimelinePayload } from "@/application/risk-orchestrator/processing-timeline-payload";
import {
  CoordinatorAttentionService,
  type CoordinatorAttentionServiceDependencies,
} from "@/application/coordinator-attention";
import { serializeRiskState } from "@/application/persistence/risk-state-serialization";
import { VesselRiskRecordService } from "@/application/vessel-risk-record";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import { TEST_MARINE_REFERENCE } from "@/test-support/persistence/test-marine-reference";
import {
  buildConcern,
  buildRiskState,
  STABLE_MARINE,
} from "@/evals/fixtures/risk-state-factory";

export const COORD_NOW = "2026-07-13T12:00:00.000Z";

export interface CoordinatorTestHarness {
  service: CoordinatorAttentionService;
  vesselRiskRecord: VesselRiskRecordService;
  repos: ReturnType<typeof createInMemoryPersistenceRepositories>;
}

export function createCoordinatorTestHarness(
  now: string = COORD_NOW,
): CoordinatorTestHarness {
  const repos = createInMemoryPersistenceRepositories();
  const vesselRiskRecord = new VesselRiskRecordService(repos);
  const deps: CoordinatorAttentionServiceDependencies = {
    trips: repos.trips,
    vessels: repos.vessels,
    riskStates: repos.riskStates,
    timeline: repos.timeline,
    now: () => now,
  };

  return {
    service: new CoordinatorAttentionService(deps),
    vesselRiskRecord,
    repos,
  };
}

export async function appendProcessingTrace(
  harness: CoordinatorTestHarness,
  tripId: string,
  result: RiskEventProcessingResult,
  occurredAt: string,
  eventId: string,
) {
  await harness.repos.timeline.append({
    id: eventId,
    tripId,
    type: "RISK_EVENT_PROCESSED",
    payload: buildProcessingTimelinePayload(result),
    occurredAt,
    createdAt: occurredAt,
  });
}

export async function seedTripWithRiskState(options: {
  harness: CoordinatorTestHarness;
  tripId: string;
  vesselId: string;
  displayName: string;
  posture: RiskPosture;
  activeConcerns?: readonly VesselConcern[];
  startedAt: string;
  lastEvaluatedAt: string;
  version?: number;
  registrationReference?: string | null;
}) {
  const { harness } = options;
  const createdAt = options.startedAt;

  await harness.vesselRiskRecord.createVessel(
    {
      id: options.vesselId,
      displayName: options.displayName,
      registrationReference: options.registrationReference ?? null,
      vesselType: "Small fibre boat",
    },
    { createdAt, updatedAt: createdAt },
  );

  await harness.vesselRiskRecord.createTrip(
    {
      id: options.tripId,
      vesselId: options.vesselId,
      crewCount: 5,
      plannedDurationHours: 8,
      status: "ACTIVE",
      startedAt: options.startedAt,
      expectedReturnAt: "2026-07-13T20:00:00.000Z",
      ...TEST_MARINE_REFERENCE,
    },
    { createdAt, updatedAt: createdAt },
    {
      eventId: `${options.tripId}-created`,
      occurredAt: createdAt,
      eventCreatedAt: createdAt,
    },
  );

  const riskState = buildRiskState({
    marineState: STABLE_MARINE,
    posture: options.posture,
    activeConcerns: options.activeConcerns ?? [],
    lastEvaluatedAt: options.lastEvaluatedAt,
    version: options.version ?? 1,
    tripContext: {
      tripId: options.tripId,
      vesselId: options.vesselId,
      crewCount: 5,
      plannedDurationHours: 8,
      tripStatus: "ACTIVE",
      marineReferenceLocation: {
        latitude: TEST_MARINE_REFERENCE.marineReferenceLatitude,
        longitude: TEST_MARINE_REFERENCE.marineReferenceLongitude,
        label: TEST_MARINE_REFERENCE.marineReferenceLabel,
      },
      startedAt: options.startedAt,
    },
  });

  await harness.repos.riskStates.create({
    id: `${options.tripId}-snapshot-${riskState.version}`,
    tripId: options.tripId,
    version: riskState.version,
    posture: riskState.posture,
    stateJson: serializeRiskState(riskState),
    lastEvaluatedAt: riskState.lastEvaluatedAt,
    createdAt: options.lastEvaluatedAt,
  });
}

export function buildProcessingResult(
  partial: Partial<RiskEventProcessingResult> &
    Pick<RiskEventProcessingResult, "eventId" | "currentPosture" | "processedAt">,
): RiskEventProcessingResult {
  return {
    tripId: partial.tripId ?? "trip-unknown",
    eventType: partial.eventType ?? "MARINE_STATE_UPDATED",
    duplicateEvent: partial.duplicateEvent ?? false,
    previousStateVersion: partial.previousStateVersion ?? 1,
    newStateVersion: partial.newStateVersion ?? 2,
    stateSnapshotCreated: partial.stateSnapshotCreated ?? true,
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
      derivedAt: partial.processedAt,
    },
    interpretationStatus: partial.interpretationStatus ?? "SKIPPED",
    interpretation: partial.interpretation ?? null,
    interpretationFailureReason: partial.interpretationFailureReason ?? null,
    previousPosture: partial.previousPosture ?? "CAUTION",
    currentPosture: partial.currentPosture,
    processedAt: partial.processedAt,
    eventId: partial.eventId,
  };
}

export function engineConcernOpen() {
  return buildConcern({
    id: "concern-engine-tn04",
    concept: "ENGINE_RELIABILITY",
    status: "OPEN",
    summary: "Engine stopped twice and required restart.",
  });
}

export function commsConcernOpen() {
  return buildConcern({
    id: "concern-comms-tn07",
    concept: "PRIMARY_COMMUNICATION",
    status: "OPEN",
    summary: "Primary radio intermittent.",
  });
}

export function resolutionReportedConcern() {
  return buildConcern({
    id: "concern-resolution-reported",
    concept: "ENGINE_RELIABILITY",
    status: "RESOLUTION_REPORTED",
    summary: "Crew reports engine issue resolved.",
  });
}
