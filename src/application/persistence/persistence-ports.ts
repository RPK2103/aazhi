import type { RiskState, VesselConcern } from "@/domain/risk";
import type {
  PersistedTrip,
  PersistedVessel,
  TimelineEventRecord,
  TripRiskStateSnapshotRecord,
} from "./persistence-models";

export interface CreateVesselInput {
  id: string;
  displayName: string;
  registrationReference?: string | null;
  vesselType: string;
}

export interface CreateTripInput {
  id: string;
  vesselId: string;
  crewCount: number;
  plannedDurationHours: number;
  status: string;
  startedAt?: string | null;
  expectedReturnAt?: string | null;
  endedAt?: string | null;
}

export interface CreateTripRiskStateSnapshotInput {
  id: string;
  tripId: string;
  version: number;
  posture: string;
  stateJson: unknown;
  lastEvaluatedAt: string;
  createdAt: string;
}

export interface CreateTimelineEventInput {
  id: string;
  tripId: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface VesselRepository {
  create(
    input: CreateVesselInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<PersistedVessel>;
  findById(id: string): Promise<PersistedVessel | null>;
}

export interface VesselConcernRepository {
  create(
    concern: VesselConcern,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<VesselConcern>;
  findById(id: string): Promise<VesselConcern | null>;
  findByVesselId(vesselId: string): Promise<VesselConcern[]>;
  update(
    concern: VesselConcern,
    timestamps: { updatedAt: string },
  ): Promise<VesselConcern>;
}

export interface TripRepository {
  create(
    input: CreateTripInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<PersistedTrip>;
  findById(id: string): Promise<PersistedTrip | null>;
}

export interface TripRiskStateRepository {
  create(input: CreateTripRiskStateSnapshotInput): Promise<TripRiskStateSnapshotRecord>;
  findLatestByTripId(tripId: string): Promise<TripRiskStateSnapshotRecord | null>;
  findByTripIdAndVersion(
    tripId: string,
    version: number,
  ): Promise<TripRiskStateSnapshotRecord | null>;
}

export interface TimelineEventRepository {
  append(input: CreateTimelineEventInput): Promise<TimelineEventRecord>;
  findByTripId(tripId: string): Promise<TimelineEventRecord[]>;
}

export interface LoadedTripRiskState {
  snapshot: TripRiskStateSnapshotRecord;
  riskState: RiskState;
}
