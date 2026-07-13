import { validateMarineReferenceLocation } from "@/domain/risk";
import { isActiveConcern } from "@/domain/risk";
import { deserializeRiskState } from "@/application/persistence/risk-state-serialization";
import type {
  TimelineEventRepository,
  TripRepository,
  TripRiskStateRepository,
  VesselRepository,
} from "@/application/persistence/persistence-ports";
import type { PersistedTrip, PersistedVessel } from "@/application/persistence/persistence-models";
import {
  deriveAttentionBasis,
  findLatestAttentionRelevantTrace,
  findLatestManualCheckAt,
  findLatestProcessingTraceEvent,
} from "./attention-basis";
import { getAttentionGroupFromPosture } from "./attention-priority";
import {
  COORDINATOR_MANUAL_MONITORING_NOTICE,
  type AttentionBasisDto,
  type CoordinatorAttentionDTO,
  type CoordinatorTripAttentionDTO,
} from "./coordinator-attention-dto";
import { CoordinatorAttentionIncompleteStateError } from "./coordinator-attention-errors";
import {
  buildCoordinatorAttentionSummary,
  groupTripsByAttention,
  sortCoordinatorAttentionTrips,
} from "./coordinator-attention-sort";

export interface CoordinatorAttentionServiceDependencies {
  trips: TripRepository;
  vessels: VesselRepository;
  riskStates: TripRiskStateRepository;
  timeline: TimelineEventRepository;
  now: () => string;
}

function marineReferenceFromTrip(trip: PersistedTrip) {
  return validateMarineReferenceLocation({
    latitude: trip.marineReferenceLatitude,
    longitude: trip.marineReferenceLongitude,
    label: trip.marineReferenceLabel,
  });
}

function toAttentionBasisDto(
  basis: ReturnType<typeof deriveAttentionBasis>,
): AttentionBasisDto {
  return {
    kind: basis.kind,
    currentPosture: basis.currentPosture,
    activeConcernConcepts: basis.activeConcernConcepts,
    materialDeltas: basis.materialDeltas,
    reassessmentDecision: basis.reassessmentDecision,
    policyAction: basis.policyAction,
    interpretationStatus: basis.interpretationStatus,
    interpretation: basis.interpretation,
    occurredAt: basis.occurredAt,
  };
}

export class CoordinatorAttentionService {
  constructor(private readonly deps: CoordinatorAttentionServiceDependencies) {}

  async getCoordinatorAttention(): Promise<CoordinatorAttentionDTO> {
    const activeTrips = await this.deps.trips.listActiveTrips();
    const vesselIds = [...new Set(activeTrips.map((trip) => trip.vesselId))];
    const vessels = await this.deps.vessels.findByIds(vesselIds);
    const vesselById = new Map<string, PersistedVessel>(
      vessels.map((vessel) => [vessel.id, vessel]),
    );

    const tripProjections: CoordinatorTripAttentionDTO[] = [];

    for (const trip of activeTrips) {
      const projection = await this.projectTripAttention(trip, vesselById);
      tripProjections.push(projection);
    }

    const sortedTrips = sortCoordinatorAttentionTrips(tripProjections);
    const groups = groupTripsByAttention(sortedTrips);

    return {
      generatedAt: this.deps.now(),
      summary: buildCoordinatorAttentionSummary(sortedTrips),
      attentionRequired: groups.attentionRequired,
      watch: groups.watch,
      stable: groups.stable,
      manualMonitoringNotice: COORDINATOR_MANUAL_MONITORING_NOTICE,
    };
  }

  private async projectTripAttention(
    trip: PersistedTrip,
    vesselById: Map<string, PersistedVessel>,
  ): Promise<CoordinatorTripAttentionDTO> {
    const snapshot = await this.deps.riskStates.findLatestByTripId(trip.id);
    if (!snapshot) {
      throw new CoordinatorAttentionIncompleteStateError(trip.id);
    }

    const riskState = deserializeRiskState(snapshot.stateJson);
    const timelineEvents = await this.deps.timeline.findByTripId(trip.id);
    const latestProcessing = findLatestProcessingTraceEvent(timelineEvents);
    const attentionRelevantTrace = findLatestAttentionRelevantTrace(timelineEvents);
    const attentionBasis = deriveAttentionBasis({
      currentPosture: riskState.posture,
      activeConcerns: riskState.activeConcerns,
      lastEvaluatedAt: riskState.lastEvaluatedAt,
      attentionRelevantTrace,
    });

    const vessel = vesselById.get(trip.vesselId);
    const activeConcerns = riskState.activeConcerns.filter(isActiveConcern);

    return {
      tripId: trip.id,
      vesselId: trip.vesselId,
      tripStatus: trip.status,
      vesselDisplayName: vessel?.displayName ?? trip.vesselId,
      registrationReference: vessel?.registrationReference ?? null,
      vesselType: vessel?.vesselType ?? "Unknown",
      marineReferenceLocation: marineReferenceFromTrip(trip),
      crewCount: trip.crewCount,
      plannedDurationHours: trip.plannedDurationHours,
      startedAt: trip.startedAt,
      expectedReturnAt: trip.expectedReturnAt,
      currentPosture: riskState.posture,
      attentionGroup: getAttentionGroupFromPosture(riskState.posture),
      activeConcerns,
      stateVersion: riskState.version,
      riskStateRecordedAt: riskState.lastEvaluatedAt,
      latestManualCheckAt: findLatestManualCheckAt(timelineEvents),
      latestPolicyAction: latestProcessing?.trace.policyDecision.action ?? null,
      attentionBasis: toAttentionBasisDto(attentionBasis),
      latestProcessingInterpretationStatus:
        latestProcessing?.trace.interpretationStatus ?? null,
      attentionRelevantTraceOccurredAt: attentionRelevantTrace?.occurredAt ?? null,
    };
  }
}
