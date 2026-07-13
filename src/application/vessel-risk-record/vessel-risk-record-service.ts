import {
  canTransitionConcernStatus,
  isActiveConcern,
  isTripStatus,
  validateMarineReferenceLocation,
  type ConcernStatus,
  type MarineRiskState,
  type RiskPosture,
  type RiskState,
  type TripContext,
  type VesselConcern,
} from "@/domain/risk";
import {
  ConcernNotFoundError,
  ConcernTransitionError,
  TripNotFoundError,
  VesselNotFoundError,
} from "@/application/persistence/persistence-errors";
import type {
  CreateTripInput,
  CreateVesselInput,
  LoadedTripRiskState,
  TimelineEventRepository,
  TripRepository,
  TripRiskStateRepository,
  VesselConcernRepository,
  VesselRepository,
} from "@/application/persistence/persistence-ports";
import type {
  PersistedTrip,
  PersistedVessel,
  TimelineEventRecord,
} from "@/application/persistence/persistence-models";
import { serializeRiskState, deserializeRiskState } from "@/application/persistence/risk-state-serialization";
import { PersistenceMappingError } from "@/application/persistence/persistence-errors";

export interface VesselRiskRecordRepositories {
  vessels: VesselRepository;
  concerns: VesselConcernRepository;
  trips: TripRepository;
  riskStates: TripRiskStateRepository;
  timeline: TimelineEventRepository;
}

export interface ReportVesselConcernInput {
  id: string;
  vesselId: string;
  concept: VesselConcern["concept"];
  summary: string;
  status: ConcernStatus;
  reportedAt: string;
}

export interface CreateInitialTripRiskStateInput {
  tripId: string;
  marineState: MarineRiskState;
  posture: RiskPosture;
  lastEvaluatedAt: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  timelineOccurredAt: string;
  timelineCreatedAt: string;
}

export interface AppendTimelineEventInput {
  id: string;
  tripId: string;
  type: TimelineEventRecord["type"];
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export class VesselRiskRecordService {
  constructor(private readonly repos: VesselRiskRecordRepositories) {}

  async createVessel(
    input: CreateVesselInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<PersistedVessel> {
    return this.repos.vessels.create(input, timestamps);
  }

  async reportVesselConcern(
    input: ReportVesselConcernInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<VesselConcern> {
    const vessel = await this.repos.vessels.findById(input.vesselId);
    if (!vessel) {
      throw new VesselNotFoundError(input.vesselId);
    }

    const concern: VesselConcern = {
      id: input.id,
      vesselId: input.vesselId,
      concept: input.concept,
      summary: input.summary,
      status: input.status,
      reportedAt: input.reportedAt,
    };

    return this.repos.concerns.create(concern, timestamps);
  }

  async updateConcernStatus(
    concernId: string,
    nextStatus: ConcernStatus,
    timestamps: { updatedAt: string; lifecycleAt: string },
  ): Promise<VesselConcern> {
    const current = await this.repos.concerns.findById(concernId);
    if (!current) {
      throw new ConcernNotFoundError(concernId);
    }

    if (!canTransitionConcernStatus(current.status, nextStatus)) {
      throw new ConcernTransitionError(
        `Invalid concern status transition: ${current.status} -> ${nextStatus}`,
      );
    }

    const updated: VesselConcern = {
      ...current,
      status: nextStatus,
      resolutionReportedAt:
        nextStatus === "RESOLUTION_REPORTED"
          ? timestamps.lifecycleAt
          : nextStatus === "OPEN"
            ? undefined
            : current.resolutionReportedAt,
      resolvedAt:
        nextStatus === "RESOLVED"
          ? timestamps.lifecycleAt
          : nextStatus === "OPEN"
            ? undefined
            : current.resolvedAt,
      dismissedAt:
        nextStatus === "DISMISSED"
          ? timestamps.lifecycleAt
          : nextStatus === "OPEN"
            ? undefined
            : current.dismissedAt,
    };

    return this.repos.concerns.update(updated, { updatedAt: timestamps.updatedAt });
  }

  async createTrip(
    input: CreateTripInput,
    timestamps: { createdAt: string; updatedAt: string },
    timeline: {
      eventId: string;
      occurredAt: string;
      eventCreatedAt: string;
    },
  ): Promise<PersistedTrip> {
    const vessel = await this.repos.vessels.findById(input.vesselId);
    if (!vessel) {
      throw new VesselNotFoundError(input.vesselId);
    }

    if (!isTripStatus(input.status)) {
      throw new PersistenceMappingError(`Unsupported trip status: ${input.status}`, "status");
    }

    const trip = await this.repos.trips.create(input, timestamps);

    await this.repos.timeline.append({
      id: timeline.eventId,
      tripId: trip.id,
      type: "TRIP_CREATED",
      payload: {
        vesselId: trip.vesselId,
        crewCount: trip.crewCount,
        plannedDurationHours: trip.plannedDurationHours,
        status: trip.status,
      },
      occurredAt: timeline.occurredAt,
      createdAt: timeline.eventCreatedAt,
    });

    return trip;
  }

  async loadActiveVesselConcerns(vesselId: string): Promise<VesselConcern[]> {
    const concerns = await this.repos.concerns.findByVesselId(vesselId);
    return concerns.filter(isActiveConcern);
  }

  async createInitialTripRiskState(
    input: CreateInitialTripRiskStateInput,
  ): Promise<LoadedTripRiskState> {
    const trip = await this.repos.trips.findById(input.tripId);
    if (!trip) {
      throw new TripNotFoundError(input.tripId);
    }

    if (!isTripStatus(trip.status)) {
      throw new TripNotFoundError(input.tripId);
    }

    const activeConcerns = await this.loadActiveVesselConcerns(trip.vesselId);

    const tripContext: TripContext = {
      tripId: trip.id,
      vesselId: trip.vesselId,
      crewCount: trip.crewCount,
      plannedDurationHours: trip.plannedDurationHours,
      tripStatus: trip.status,
      marineReferenceLocation: validateMarineReferenceLocation({
        latitude: trip.marineReferenceLatitude,
        longitude: trip.marineReferenceLongitude,
        label: trip.marineReferenceLabel,
      }),
      startedAt: trip.startedAt ?? undefined,
      expectedReturnAt: trip.expectedReturnAt ?? undefined,
      endedAt: trip.endedAt ?? undefined,
    };

    const riskState: RiskState = {
      tripContext,
      marineState: input.marineState,
      activeConcerns: activeConcerns.map((concern) => ({ ...concern })),
      posture: input.posture,
      lastEvaluatedAt: input.lastEvaluatedAt,
      version: 1,
    };

    const snapshot = await this.repos.riskStates.create({
      id: input.snapshotId,
      tripId: input.tripId,
      version: riskState.version,
      posture: riskState.posture,
      stateJson: serializeRiskState(riskState),
      lastEvaluatedAt: input.lastEvaluatedAt,
      createdAt: input.snapshotCreatedAt,
    });

    for (const concern of activeConcerns) {
      await this.repos.timeline.append({
        id: `${input.tripId}-carry-${concern.id}`,
        tripId: input.tripId,
        type: "CONCERN_CARRIED_FORWARD",
        payload: {
          concernId: concern.id,
          concept: concern.concept,
          status: concern.status,
        },
        occurredAt: input.timelineOccurredAt,
        createdAt: input.timelineCreatedAt,
      });
    }

    await this.repos.timeline.append({
      id: `${input.tripId}-snapshot-${riskState.version}`,
      tripId: input.tripId,
      type: "RISK_STATE_SNAPSHOT_CREATED",
      payload: {
        snapshotId: snapshot.id,
        version: riskState.version,
        posture: riskState.posture,
      },
      occurredAt: input.timelineOccurredAt,
      createdAt: input.timelineCreatedAt,
    });

    return {
      snapshot,
      riskState: deserializeRiskState(snapshot.stateJson),
    };
  }

  async loadLatestTripRiskState(tripId: string): Promise<LoadedTripRiskState | null> {
    const snapshot = await this.repos.riskStates.findLatestByTripId(tripId);
    if (!snapshot) {
      return null;
    }
    return {
      snapshot,
      riskState: deserializeRiskState(snapshot.stateJson),
    };
  }

  async loadTripRiskStateByVersion(
    tripId: string,
    version: number,
  ): Promise<LoadedTripRiskState | null> {
    const snapshot = await this.repos.riskStates.findByTripIdAndVersion(tripId, version);
    if (!snapshot) {
      return null;
    }
    return {
      snapshot,
      riskState: deserializeRiskState(snapshot.stateJson),
    };
  }

  async appendTimelineEvent(input: AppendTimelineEventInput): Promise<TimelineEventRecord> {
    const trip = await this.repos.trips.findById(input.tripId);
    if (!trip) {
      throw new TripNotFoundError(input.tripId);
    }

    return this.repos.timeline.append(input);
  }

  async findVesselById(vesselId: string): Promise<PersistedVessel | null> {
    return this.repos.vessels.findById(vesselId);
  }

  async findTripById(tripId: string): Promise<PersistedTrip | null> {
    return this.repos.trips.findById(tripId);
  }

  async loadTripTimeline(tripId: string): Promise<TimelineEventRecord[]> {
    const trip = await this.repos.trips.findById(tripId);
    if (!trip) {
      throw new TripNotFoundError(tripId);
    }
    return this.repos.timeline.findByTripId(tripId);
  }
}
