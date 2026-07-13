import type { MarineRiskState, MarineReferenceLocation } from "@/domain/risk";
import { validateMarineReferenceLocation } from "@/domain/risk";
import type { PersistedTrip, TimelineEventRecord } from "@/application/persistence/persistence-models";
import type { LoadedTripRiskState } from "@/application/persistence/persistence-ports";
import {
  processRiskEvent,
  type RiskOrchestratorDependencies,
} from "@/application/risk-orchestrator";
import { VesselRiskRecordService } from "@/application/vessel-risk-record";
import type { ManualCarryForwardConcept } from "./manual-concern-concepts";
import { deriveInitialActiveRiskPosture } from "./initial-risk-posture";
import {
  MANUAL_MONITORING_NOTICE,
  type ActiveTripDto,
  type ActiveTripStartResponse,
  type ActiveTripTimelineEntry,
  type RefreshMarineResponse,
} from "./active-trip-dto";
import {
  findLatestProcessingTrace,
  mapTimelineEventsToDto,
} from "./timeline-dto";
import { ActiveTripNotFoundError, InvalidVesselReferenceError } from "./active-trip-errors";

export interface ActiveTripServiceDependencies {
  vesselRiskRecord: VesselRiskRecordService;
  orchestrator: RiskOrchestratorDependencies;
  fetchMarineRiskState: (latitude: number, longitude: number) => Promise<MarineRiskState>;
  createId: () => string;
  now: () => string;
}

export interface StartActiveTripInput {
  vesselId?: string;
  vessel?: {
    displayName: string;
    registrationReference?: string | null;
    vesselType: string;
  };
  crewCount: number;
  plannedDurationHours: number;
  marineReferenceLocation: MarineReferenceLocation;
  assessmentPosture: string;
  confirmedConcern?: {
    concept: ManualCarryForwardConcept;
    summary: string;
  };
}

function marineReferenceFromTrip(trip: PersistedTrip): MarineReferenceLocation {
  return validateMarineReferenceLocation({
    latitude: trip.marineReferenceLatitude,
    longitude: trip.marineReferenceLongitude,
    label: trip.marineReferenceLabel,
  });
}

function deriveExpectedReturnAt(startedAt: string, plannedDurationHours: number): string {
  const startedMs = Date.parse(startedAt);
  return new Date(startedMs + plannedDurationHours * 60 * 60 * 1000).toISOString();
}

function buildActiveTripDto(
  trip: PersistedTrip,
  loadedState: LoadedTripRiskState,
  timelineEvents: readonly TimelineEventRecord[],
): ActiveTripDto {
  const timeline = mapTimelineEventsToDto(timelineEvents);
  const latestProcessingTrace = findLatestProcessingTrace(timelineEvents);
  const { riskState } = loadedState;

  return {
    tripId: trip.id,
    vesselId: trip.vesselId,
    tripStatus: trip.status,
    crewCount: trip.crewCount,
    plannedDurationHours: trip.plannedDurationHours,
    startedAt: trip.startedAt,
    expectedReturnAt: trip.expectedReturnAt,
    marineReferenceLocation: marineReferenceFromTrip(trip),
    currentPosture: riskState.posture,
    stateVersion: riskState.version,
    lastEvaluatedAt: riskState.lastEvaluatedAt,
    currentMarineState: riskState.marineState,
    activeConcerns: riskState.activeConcerns,
    timeline,
    manualMonitoringNotice: MANUAL_MONITORING_NOTICE,
    latestProcessingTrace,
    latestPolicyAction: latestProcessingTrace?.policyDecision.action ?? null,
  };
}

function toStartResponse(activeTrip: ActiveTripDto): ActiveTripStartResponse {
  return {
    vesselId: activeTrip.vesselId,
    tripId: activeTrip.tripId,
    tripStatus: activeTrip.tripStatus,
    currentPosture: activeTrip.currentPosture,
    stateVersion: activeTrip.stateVersion,
    lastEvaluatedAt: activeTrip.lastEvaluatedAt,
    marineReferenceLocation: activeTrip.marineReferenceLocation,
    currentMarineState: activeTrip.currentMarineState,
    activeConcerns: activeTrip.activeConcerns,
    manualMonitoringNotice: activeTrip.manualMonitoringNotice,
  };
}

export class ActiveTripService {
  constructor(private readonly deps: ActiveTripServiceDependencies) {}

  async startTrip(input: StartActiveTripInput): Promise<ActiveTripStartResponse> {
    const now = this.deps.now();
    const marineReference = validateMarineReferenceLocation(input.marineReferenceLocation);
    let vesselId = input.vesselId;

    if (vesselId) {
      const vessel = await this.deps.vesselRiskRecord.findVesselById(vesselId);
      if (!vessel) {
        throw new InvalidVesselReferenceError(vesselId);
      }
    } else {
      if (!input.vessel) {
        throw new Error("vessel is required when vesselId is absent");
      }
      vesselId = this.deps.createId();
      await this.deps.vesselRiskRecord.createVessel(
        {
          id: vesselId,
          displayName: input.vessel.displayName,
          registrationReference: input.vessel.registrationReference ?? null,
          vesselType: input.vessel.vesselType,
        },
        { createdAt: now, updatedAt: now },
      );
    }

    if (input.confirmedConcern) {
      await this.deps.vesselRiskRecord.reportVesselConcern(
        {
          id: this.deps.createId(),
          vesselId,
          concept: input.confirmedConcern.concept,
          summary: input.confirmedConcern.summary.trim(),
          status: "OPEN",
          reportedAt: now,
        },
        { createdAt: now, updatedAt: now },
      );
    }

    const marineState = await this.deps.fetchMarineRiskState(
      marineReference.latitude,
      marineReference.longitude,
    );

    const tripId = this.deps.createId();
    const posture = deriveInitialActiveRiskPosture(input.assessmentPosture);
    const expectedReturnAt = deriveExpectedReturnAt(now, input.plannedDurationHours);

    await this.deps.vesselRiskRecord.createTrip(
      {
        id: tripId,
        vesselId,
        crewCount: input.crewCount,
        plannedDurationHours: input.plannedDurationHours,
        status: "ACTIVE",
        marineReferenceLatitude: marineReference.latitude,
        marineReferenceLongitude: marineReference.longitude,
        marineReferenceLabel: marineReference.label,
        startedAt: now,
        expectedReturnAt,
      },
      { createdAt: now, updatedAt: now },
      {
        eventId: `${tripId}-created`,
        occurredAt: now,
        eventCreatedAt: now,
      },
    );

    await this.deps.vesselRiskRecord.createInitialTripRiskState({
      tripId,
      marineState,
      posture,
      lastEvaluatedAt: now,
      snapshotId: `${tripId}-snapshot-1`,
      snapshotCreatedAt: now,
      timelineOccurredAt: now,
      timelineCreatedAt: now,
    });

    const activeTrip = await this.getActiveTrip(tripId);
    if (!activeTrip) {
      throw new ActiveTripNotFoundError(tripId);
    }

    return toStartResponse(activeTrip);
  }

  async getActiveTrip(tripId: string): Promise<ActiveTripDto | null> {
    const trip = await this.deps.vesselRiskRecord.findTripById(tripId);
    if (!trip) {
      return null;
    }

    const loadedState = await this.deps.vesselRiskRecord.loadLatestTripRiskState(tripId);
    if (!loadedState) {
      return null;
    }

    const timelineEvents = await this.deps.vesselRiskRecord.loadTripTimeline(tripId);
    return buildActiveTripDto(trip, loadedState, timelineEvents);
  }

  async refreshMarine(tripId: string): Promise<RefreshMarineResponse> {
    const trip = await this.deps.vesselRiskRecord.findTripById(tripId);
    if (!trip) {
      throw new ActiveTripNotFoundError(tripId);
    }

    const marineReference = marineReferenceFromTrip(trip);
    const now = this.deps.now();
    const marineState = await this.deps.fetchMarineRiskState(
      marineReference.latitude,
      marineReference.longitude,
    );

    const eventId = this.deps.createId();
    const processingResult = await processRiskEvent(
      {
        event: {
          id: eventId,
          tripId,
          type: "MARINE_STATE_UPDATED",
          occurredAt: now,
          marineState,
        },
        processedAt: now,
        timelineEventId: `${tripId}-processed-${eventId}`,
        timelineCreatedAt: now,
        snapshotId: `${tripId}-snapshot-next-${eventId}`,
        snapshotCreatedAt: now,
      },
      this.deps.orchestrator,
    );

    const activeTrip = await this.getActiveTrip(tripId);
    if (!activeTrip) {
      throw new ActiveTripNotFoundError(tripId);
    }

    return { processingResult, activeTrip };
  }
}

export type { ActiveTripTimelineEntry };
