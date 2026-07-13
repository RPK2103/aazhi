import {
  VesselRiskRecordService,
  type VesselRiskRecordRepositories,
} from "@/application/vessel-risk-record";
import type { RiskOrchestratorDependencies } from "@/application/risk-orchestrator";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import type { RiskInterpreterProvider } from "@/lib/ai";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import { TEST_MARINE_REFERENCE } from "@/test-support/persistence/test-marine-reference";

export const ORCH_DAY1_CREATED_AT = "2026-07-12T05:00:00.000Z";
export const ORCH_DAY1_UPDATED_AT = "2026-07-12T05:00:00.000Z";
export const ORCH_DAY1_REPORTED_AT = "2026-07-12T05:30:00.000Z";
export const ORCH_DAY2_CREATED_AT = "2026-07-13T06:00:00.000Z";
export const ORCH_DAY2_UPDATED_AT = "2026-07-13T06:00:00.000Z";
export const ORCH_DAY2_EVALUATED_AT = "2026-07-13T06:00:00.000Z";
export const ORCH_DAY2_MARINE_CAPTURED_AT = "2026-07-13T05:55:00.000Z";
export const ORCH_EVENT_PROCESSED_AT = "2026-07-13T07:00:00.000Z";

export const S003_TRIP_ID = "trip-tn04-s003";
export const S003_VESSEL_ID = "TN-04";
export const S003_CONCERN_ID = "concern-engine-tn04-s003";
export const S003_EVENT_ID = "evt-s003-marine-001";

export function createCountingInterpreterProvider(
  response: unknown,
  options?: { shouldThrow?: boolean },
): {
  provider: RiskInterpreterProvider;
  getInvocationCount: () => number;
} {
  let invocationCount = 0;
  return {
    provider: {
      interpret: async () => {
        invocationCount += 1;
        if (options?.shouldThrow) {
          throw new Error("provider failure");
        }
        return response;
      },
    },
    getInvocationCount: () => invocationCount,
  };
}

export function buildS003ValidInterpretationResponse() {
  const engineRecord = INITIAL_SAFETY_KNOWLEDGE.find(
    (record) => record.id === "sk-fao-ilo-imo-engine-001",
  );
  const waveRecord = INITIAL_SAFETY_KNOWLEDGE.find(
    (record) => record.id === "sk-incois-wave-context-001",
  );

  return {
    interactionSummary:
      "Wave conditions changed from the earlier trip state while the previously reported engine reliability concern remains unresolved.",
    significance:
      "The unresolved propulsion concern may become more operationally relevant when environmental conditions change.",
    uncertainty:
      "AAZHI cannot verify the mechanical condition of the engine or determine vessel seaworthiness.",
    relevantConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"] as const,
    groundingSources: [
      {
        recordId: engineRecord!.id,
        authority: engineRecord!.authority,
        documentTitle: engineRecord!.documentTitle,
        sourceLocator: engineRecord!.sourceLocator,
        sourceUrl: engineRecord!.sourceUrl,
      },
      {
        recordId: waveRecord!.id,
        authority: waveRecord!.authority,
        documentTitle: waveRecord!.documentTitle,
        sourceLocator: waveRecord!.sourceLocator,
        sourceUrl: waveRecord!.sourceUrl,
      },
    ],
  };
}

export async function seedS003PersistedTrip(
  repos?: VesselRiskRecordRepositories,
): Promise<{
  service: VesselRiskRecordService;
  repos: VesselRiskRecordRepositories;
  tripId: string;
}> {
  const resolvedRepos = repos ?? createInMemoryPersistenceRepositories();
  const service = new VesselRiskRecordService(resolvedRepos);

  await service.createVessel(
    {
      id: S003_VESSEL_ID,
      displayName: S003_VESSEL_ID,
      vesselType: "fiberglass",
    },
    { createdAt: ORCH_DAY1_CREATED_AT, updatedAt: ORCH_DAY1_UPDATED_AT },
  );

  await service.reportVesselConcern(
    {
      id: S003_CONCERN_ID,
      vesselId: S003_VESSEL_ID,
      concept: "ENGINE_RELIABILITY",
      summary: "Engine stopped twice and required restart.",
      status: "OPEN",
      reportedAt: ORCH_DAY1_REPORTED_AT,
    },
    { createdAt: ORCH_DAY1_CREATED_AT, updatedAt: ORCH_DAY1_UPDATED_AT },
  );

  const trip = await service.createTrip(
    {
      id: S003_TRIP_ID,
      vesselId: S003_VESSEL_ID,
      crewCount: 5,
      plannedDurationHours: 8,
      status: "ACTIVE",
      ...TEST_MARINE_REFERENCE,
    },
    { createdAt: ORCH_DAY2_CREATED_AT, updatedAt: ORCH_DAY2_UPDATED_AT },
    {
      eventId: `${S003_TRIP_ID}-created`,
      occurredAt: ORCH_DAY2_CREATED_AT,
      eventCreatedAt: ORCH_DAY2_CREATED_AT,
    },
  );

  await service.createInitialTripRiskState({
    tripId: trip.id,
    marineState: {
      waveHeightM: 0.8,
      wavePeriodS: null,
      windSpeedKmh: 13,
      windDirectionDeg: null,
      capturedAt: ORCH_DAY2_MARINE_CAPTURED_AT,
    },
    posture: "CAUTION",
    lastEvaluatedAt: ORCH_DAY2_EVALUATED_AT,
    snapshotId: `${trip.id}-snapshot-1`,
    snapshotCreatedAt: ORCH_DAY2_CREATED_AT,
    timelineOccurredAt: ORCH_DAY2_CREATED_AT,
    timelineCreatedAt: ORCH_DAY2_CREATED_AT,
  });

  return { service, repos: resolvedRepos, tripId: trip.id };
}

export function buildOrchestratorDependencies(
  repos: VesselRiskRecordRepositories,
  provider: RiskInterpreterProvider,
): RiskOrchestratorDependencies {
  return {
    tripRiskStates: repos.riskStates,
    timeline: repos.timeline,
    riskInterpreter: provider,
    safetyKnowledge: INITIAL_SAFETY_KNOWLEDGE,
  };
}
