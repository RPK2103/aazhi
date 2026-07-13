import type { RiskState } from "@/domain/risk";
import {
  VesselRiskRecordService,
  type VesselRiskRecordRepositories,
} from "@/application/vessel-risk-record";
import {
  PersistenceMappingError,
  deserializeRiskState,
  riskStatesAreEquivalent,
} from "@/application/persistence";
import {
  mapPersistedConcernStatus,
  mapPersistedRiskConcept,
  mapPersistedRiskPosture,
  mapPersistedTripStatus,
} from "@/infrastructure/persistence/prisma/persistence-mappers";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import type {
  PersistenceEvaluationResult,
  PersistenceScenarioFixture,
} from "./persistence-eval-types";

const DAY1_CREATED_AT = "2026-07-12T05:00:00.000Z";
const DAY1_UPDATED_AT = "2026-07-12T05:00:00.000Z";
const DAY1_REPORTED_AT = "2026-07-12T05:30:00.000Z";
const DAY2_CREATED_AT = "2026-07-13T06:00:00.000Z";
const DAY2_UPDATED_AT = "2026-07-13T06:00:00.000Z";
const DAY2_EVALUATED_AT = "2026-07-13T06:00:00.000Z";

export const PERSISTENCE_SCENARIO_FIXTURES: PersistenceScenarioFixture[] = [
  {
    id: "P001-open-only",
    vesselId: "VESSEL-P001",
    concerns: [
      {
        id: "concern-p001-open",
        concept: "ENGINE_RELIABILITY",
        status: "OPEN",
        active: true,
      },
    ],
    expectedCarriedConcepts: ["ENGINE_RELIABILITY"],
    expectedExcludedConcepts: [],
  },
  {
    id: "P002-resolution-reported",
    vesselId: "VESSEL-P002",
    concerns: [
      {
        id: "concern-p002-resolution-reported",
        concept: "PRIMARY_COMMUNICATION",
        status: "RESOLUTION_REPORTED",
        active: true,
      },
    ],
    expectedCarriedConcepts: ["PRIMARY_COMMUNICATION"],
    expectedExcludedConcepts: [],
  },
  {
    id: "P003-mixed-active-inactive",
    vesselId: "VESSEL-P003",
    concerns: [
      {
        id: "concern-p003-open",
        concept: "ENGINE_RELIABILITY",
        status: "OPEN",
        active: true,
      },
      {
        id: "concern-p003-resolved",
        concept: "HULL_INTEGRITY",
        status: "RESOLVED",
        active: false,
      },
      {
        id: "concern-p003-dismissed",
        concept: "SAFETY_EQUIPMENT",
        status: "DISMISSED",
        active: false,
      },
    ],
    expectedCarriedConcepts: ["ENGINE_RELIABILITY"],
    expectedExcludedConcepts: ["HULL_INTEGRITY", "SAFETY_EQUIPMENT"],
  },
];

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

async function seedScenario(
  service: VesselRiskRecordService,
  fixture: PersistenceScenarioFixture,
): Promise<string> {
  await service.createVessel(
    {
      id: fixture.vesselId,
      displayName: fixture.vesselId,
      vesselType: "fiberglass",
    },
    { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
  );

  for (const concern of fixture.concerns) {
    await service.reportVesselConcern(
      {
        id: concern.id,
        vesselId: fixture.vesselId,
        concept: concern.concept,
        status: concern.status,
        summary: `Synthetic concern ${concern.id}`,
        reportedAt: DAY1_REPORTED_AT,
      },
      { createdAt: DAY1_CREATED_AT, updatedAt: DAY1_UPDATED_AT },
    );
  }

  const trip = await service.createTrip(
    {
      id: `trip-${fixture.id}`,
      vesselId: fixture.vesselId,
      crewCount: 5,
      plannedDurationHours: 8,
      status: "ACTIVE",
    },
    { createdAt: DAY2_CREATED_AT, updatedAt: DAY2_UPDATED_AT },
    {
      eventId: `timeline-${fixture.id}-created`,
      occurredAt: DAY2_CREATED_AT,
      eventCreatedAt: DAY2_CREATED_AT,
    },
  );

  return trip.id;
}

function evaluateInvalidDomainValueRejection(): number {
  const checks = [
    () => mapPersistedRiskConcept("UNKNOWN", "concept"),
    () => mapPersistedConcernStatus("UNKNOWN", "status"),
    () => mapPersistedTripStatus("UNKNOWN", "status"),
    () => mapPersistedRiskPosture("UNKNOWN", "posture"),
    () => deserializeRiskState({ version: 0 }),
    () => deserializeRiskState({ invalid: true }),
  ];

  let rejected = 0;
  for (const check of checks) {
    try {
      check();
    } catch (error) {
      if (error instanceof PersistenceMappingError) {
        rejected += 1;
      }
    }
  }

  return rejected / checks.length;
}

export async function evaluatePersistenceScenarios(
  fixtures: PersistenceScenarioFixture[] = PERSISTENCE_SCENARIO_FIXTURES,
): Promise<PersistenceEvaluationResult> {
  let carryForwardMatches = 0;
  let inactiveExclusionMatches = 0;
  let roundTripMatches = 0;
  let immutabilityMatches = 0;

  for (const fixture of fixtures) {
    const { service } = createService();
    const tripId = await seedScenario(service, fixture);

    const initial = await service.createInitialTripRiskState({
      tripId,
      marineState: {
        waveHeightM: 0.8,
        wavePeriodS: null,
        windSpeedKmh: 13,
        windDirectionDeg: null,
        capturedAt: "2026-07-13T05:55:00.000Z",
      },
      posture: "CAUTION",
      lastEvaluatedAt: DAY2_EVALUATED_AT,
      snapshotId: `snapshot-${fixture.id}`,
      snapshotCreatedAt: DAY2_CREATED_AT,
      timelineOccurredAt: DAY2_CREATED_AT,
      timelineCreatedAt: DAY2_CREATED_AT,
    });

    const carriedConcepts = initial.riskState.activeConcerns.map((concern) => concern.concept);
    if (
      fixture.expectedCarriedConcepts.every((concept) => carriedConcepts.includes(concept))
    ) {
      carryForwardMatches += 1;
    }

    if (
      fixture.expectedExcludedConcepts.every((concept) => !carriedConcepts.includes(concept))
    ) {
      inactiveExclusionMatches += 1;
    }

    const latest = await service.loadLatestTripRiskState(tripId);
    if (latest && riskStatesAreEquivalent(initial.riskState, latest.riskState)) {
      roundTripMatches += 1;
    }

    const openConcern = fixture.concerns.find((concern) => concern.status === "OPEN");
    if (openConcern) {
      await service.updateConcernStatus(openConcern.id, "RESOLVED", {
        updatedAt: "2026-07-13T12:00:00.000Z",
        lifecycleAt: "2026-07-13T12:00:00.000Z",
      });

      const historical = await service.loadTripRiskStateByVersion(tripId, 1);
      if (historical?.riskState.activeConcerns.some((concern) => concern.status === "OPEN")) {
        immutabilityMatches += 1;
      }
    } else {
      immutabilityMatches += 1;
    }
  }

  const scenarioCount = fixtures.length;

  return {
    scenarioCount,
    metrics: {
      activeConcernCarryForwardAccuracy:
        scenarioCount === 0 ? 0 : carryForwardMatches / scenarioCount,
      inactiveConcernExclusionAccuracy:
        scenarioCount === 0 ? 0 : inactiveExclusionMatches / scenarioCount,
      riskStateRoundTripAccuracy: scenarioCount === 0 ? 0 : roundTripMatches / scenarioCount,
      historicalSnapshotImmutabilityAccuracy:
        scenarioCount === 0 ? 0 : immutabilityMatches / scenarioCount,
      invalidDomainValueRejectionRate: evaluateInvalidDomainValueRejection(),
    },
  };
}

export function buildReferenceRiskState(): RiskState {
  return {
    tripContext: {
      tripId: "trip-eval",
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
        summary: "Engine stopped twice and required restart.",
        status: "OPEN",
        reportedAt: DAY1_REPORTED_AT,
      },
    ],
    posture: "CAUTION",
    lastEvaluatedAt: DAY2_EVALUATED_AT,
    version: 1,
  };
}
