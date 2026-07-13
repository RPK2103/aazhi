import type { VesselConcern } from "@/domain/risk";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import type {
  CreateTimelineEventInput,
  CreateTripInput,
  CreateTripRiskStateSnapshotInput,
  CreateVesselInput,
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
  TripRiskStateSnapshotRecord,
} from "@/application/persistence/persistence-models";

export class InMemoryVesselRepository implements VesselRepository {
  private readonly records = new Map<string, PersistedVessel>();

  async create(
    input: CreateVesselInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<PersistedVessel> {
    if (this.records.has(input.id)) {
      throw new PersistenceConflictError(`Vessel already exists: ${input.id}`);
    }

    const record: PersistedVessel = {
      id: input.id,
      displayName: input.displayName,
      registrationReference: input.registrationReference ?? null,
      vesselType: input.vesselType,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<PersistedVessel | null> {
    return this.records.get(id) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<PersistedVessel[]> {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is PersistedVessel => record !== undefined)
      .map((record) => ({ ...record }));
  }
}

export class InMemoryVesselConcernRepository implements VesselConcernRepository {
  private readonly records = new Map<string, VesselConcern>();

  async create(
    concern: VesselConcern,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<VesselConcern> {
    if (this.records.has(concern.id)) {
      throw new PersistenceConflictError(`Concern already exists: ${concern.id}`);
    }

    void timestamps;
    this.records.set(concern.id, { ...concern });
    return { ...concern };
  }

  async findById(id: string): Promise<VesselConcern | null> {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async findByVesselId(vesselId: string): Promise<VesselConcern[]> {
    return [...this.records.values()]
      .filter((record) => record.vesselId === vesselId)
      .sort((a, b) => {
        const reportedCompare = a.reportedAt.localeCompare(b.reportedAt);
        return reportedCompare !== 0 ? reportedCompare : a.id.localeCompare(b.id);
      })
      .map((record) => ({ ...record }));
  }

  async update(
    concern: VesselConcern,
    timestamps: { updatedAt: string },
  ): Promise<VesselConcern> {
    void timestamps;
    if (!this.records.has(concern.id)) {
      throw new PersistenceConflictError(`Concern not found: ${concern.id}`);
    }
    this.records.set(concern.id, { ...concern });
    return { ...concern };
  }
}

export class InMemoryTripRepository implements TripRepository {
  private readonly records = new Map<string, PersistedTrip>();

  async create(
    input: CreateTripInput,
    timestamps: { createdAt: string; updatedAt: string },
  ): Promise<PersistedTrip> {
    if (this.records.has(input.id)) {
      throw new PersistenceConflictError(`Trip already exists: ${input.id}`);
    }

    const record: PersistedTrip = {
      id: input.id,
      vesselId: input.vesselId,
      crewCount: input.crewCount,
      plannedDurationHours: input.plannedDurationHours,
      status: input.status,
      marineReferenceLatitude: input.marineReferenceLatitude,
      marineReferenceLongitude: input.marineReferenceLongitude,
      marineReferenceLabel: input.marineReferenceLabel ?? null,
      startedAt: input.startedAt ?? null,
      expectedReturnAt: input.expectedReturnAt ?? null,
      endedAt: input.endedAt ?? null,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<PersistedTrip | null> {
    return this.records.get(id) ?? null;
  }

  async listActiveTrips(): Promise<PersistedTrip[]> {
    return [...this.records.values()]
      .filter((record) => record.status === "ACTIVE")
      .sort((a, b) => {
        const startedCompare = (a.startedAt ?? "").localeCompare(b.startedAt ?? "");
        return startedCompare !== 0 ? startedCompare : a.id.localeCompare(b.id);
      })
      .map((record) => ({ ...record }));
  }
}

export class InMemoryTripRiskStateRepository implements TripRiskStateRepository {
  private readonly records = new Map<string, TripRiskStateSnapshotRecord>();

  private key(tripId: string, version: number): string {
    return `${tripId}:${version}`;
  }

  async create(input: CreateTripRiskStateSnapshotInput): Promise<TripRiskStateSnapshotRecord> {
    const compositeKey = this.key(input.tripId, input.version);
    if (this.records.has(compositeKey)) {
      throw new PersistenceConflictError(
        `Trip risk state snapshot already exists for trip ${input.tripId} version ${input.version}`,
      );
    }

    const record: TripRiskStateSnapshotRecord = {
      id: input.id,
      tripId: input.tripId,
      version: input.version,
      posture: input.posture,
      stateJson: input.stateJson,
      lastEvaluatedAt: input.lastEvaluatedAt,
      createdAt: input.createdAt,
    };
    this.records.set(compositeKey, record);
    return record;
  }

  async findLatestByTripId(tripId: string): Promise<TripRiskStateSnapshotRecord | null> {
    const snapshots = [...this.records.values()]
      .filter((record) => record.tripId === tripId)
      .sort((a, b) => {
        const versionCompare = b.version - a.version;
        return versionCompare !== 0 ? versionCompare : b.id.localeCompare(a.id);
      });
    return snapshots[0] ?? null;
  }

  async findByTripIdAndVersion(
    tripId: string,
    version: number,
  ): Promise<TripRiskStateSnapshotRecord | null> {
    return this.records.get(this.key(tripId, version)) ?? null;
  }
}

export class InMemoryTimelineEventRepository implements TimelineEventRepository {
  private readonly records = new Map<string, TimelineEventRecord>();

  async append(input: CreateTimelineEventInput): Promise<TimelineEventRecord> {
    if (this.records.has(input.id)) {
      throw new PersistenceConflictError(`Timeline event already exists: ${input.id}`);
    }

    const record: TimelineEventRecord = {
      id: input.id,
      tripId: input.tripId,
      type: input.type as TimelineEventRecord["type"],
      payload: input.payload,
      occurredAt: input.occurredAt,
      createdAt: input.createdAt,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findByTripId(tripId: string): Promise<TimelineEventRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.tripId === tripId)
      .sort((a, b) => {
        const occurredCompare = a.occurredAt.localeCompare(b.occurredAt);
        return occurredCompare !== 0 ? occurredCompare : a.id.localeCompare(b.id);
      });
  }
}

export function createInMemoryPersistenceRepositories() {
  return {
    vessels: new InMemoryVesselRepository(),
    concerns: new InMemoryVesselConcernRepository(),
    trips: new InMemoryTripRepository(),
    riskStates: new InMemoryTripRiskStateRepository(),
    timeline: new InMemoryTimelineEventRepository(),
  };
}
