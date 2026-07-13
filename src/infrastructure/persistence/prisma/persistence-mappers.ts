import {
  isConcernStatus,
  isRiskConcept,
  isRiskPosture,
  isTripStatus,
  type ConcernStatus,
  type RiskConcept,
  type RiskPosture,
  type TripStatus,
  type VesselConcern,
} from "@/domain/risk";
import { PersistenceMappingError } from "@/application/persistence/persistence-errors";
import {
  isTimelineEventType,
  type PersistedTrip,
  type PersistedVessel,
  type TimelineEventRecord,
  type TripRiskStateSnapshotRecord,
} from "@/application/persistence/persistence-models";
import { deserializeRiskState } from "@/application/persistence/risk-state-serialization";
import type { LoadedTripRiskState } from "@/application/persistence/persistence-ports";

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapPersistedRiskConcept(value: string, field: string): RiskConcept {
  if (!isRiskConcept(value)) {
    throw new PersistenceMappingError(`Unsupported persisted risk concept: ${value}`, field);
  }
  return value;
}

export function mapPersistedConcernStatus(value: string, field: string): ConcernStatus {
  if (!isConcernStatus(value)) {
    throw new PersistenceMappingError(
      `Unsupported persisted concern status: ${value}`,
      field,
    );
  }
  return value;
}

export function mapPersistedTripStatus(value: string, field: string): TripStatus {
  if (!isTripStatus(value)) {
    throw new PersistenceMappingError(`Unsupported persisted trip status: ${value}`, field);
  }
  return value;
}

export function mapPersistedRiskPosture(value: string, field: string): RiskPosture {
  if (!isRiskPosture(value)) {
    throw new PersistenceMappingError(`Unsupported persisted risk posture: ${value}`, field);
  }
  return value;
}

export function mapPersistedVessel(record: {
  id: string;
  displayName: string;
  registrationReference: string | null;
  vesselType: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): PersistedVessel {
  return {
    id: record.id,
    displayName: record.displayName,
    registrationReference: record.registrationReference,
    vesselType: record.vesselType,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

export function mapPersistedTrip(record: {
  id: string;
  vesselId: string;
  crewCount: number;
  plannedDurationHours: number;
  status: string;
  startedAt: Date | string | null;
  expectedReturnAt: Date | string | null;
  endedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): PersistedTrip {
  mapPersistedTripStatus(record.status, "status");
  return {
    id: record.id,
    vesselId: record.vesselId,
    crewCount: record.crewCount,
    plannedDurationHours: record.plannedDurationHours,
    status: record.status,
    startedAt: record.startedAt ? toIsoString(record.startedAt) : null,
    expectedReturnAt: record.expectedReturnAt
      ? toIsoString(record.expectedReturnAt)
      : null,
    endedAt: record.endedAt ? toIsoString(record.endedAt) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

export function mapPersistedVesselConcern(record: {
  id: string;
  vesselId: string;
  concept: string;
  summary: string;
  status: string;
  reportedAt: Date | string;
  resolutionReportedAt: Date | string | null;
  resolvedAt: Date | string | null;
  dismissedAt: Date | string | null;
}): VesselConcern {
  return {
    id: record.id,
    vesselId: record.vesselId,
    concept: mapPersistedRiskConcept(record.concept, "concept"),
    summary: record.summary,
    status: mapPersistedConcernStatus(record.status, "status"),
    reportedAt: toIsoString(record.reportedAt),
    resolutionReportedAt: record.resolutionReportedAt
      ? toIsoString(record.resolutionReportedAt)
      : undefined,
    resolvedAt: record.resolvedAt ? toIsoString(record.resolvedAt) : undefined,
    dismissedAt: record.dismissedAt ? toIsoString(record.dismissedAt) : undefined,
  };
}

export function mapPersistedTripRiskStateSnapshot(record: {
  id: string;
  tripId: string;
  version: number;
  posture: string;
  stateJson: unknown;
  lastEvaluatedAt: Date | string;
  createdAt: Date | string;
}): TripRiskStateSnapshotRecord {
  mapPersistedRiskPosture(record.posture, "posture");
  return {
    id: record.id,
    tripId: record.tripId,
    version: record.version,
    posture: record.posture,
    stateJson: record.stateJson,
    lastEvaluatedAt: toIsoString(record.lastEvaluatedAt),
    createdAt: toIsoString(record.createdAt),
  };
}

export function mapLoadedTripRiskState(
  record: TripRiskStateSnapshotRecord,
): LoadedTripRiskState {
  mapPersistedRiskPosture(record.posture, "posture");
  const riskState = deserializeRiskState(record.stateJson);
  return {
    snapshot: record,
    riskState,
  };
}

export function mapPersistedTimelineEvent(record: {
  id: string;
  tripId: string;
  type: string;
  payload: unknown;
  occurredAt: Date | string;
  createdAt: Date | string;
}): TimelineEventRecord {
  if (!isTimelineEventType(record.type)) {
    throw new PersistenceMappingError(
      `Unsupported persisted timeline event type: ${record.type}`,
      "type",
    );
  }

  if (
    record.payload === null ||
    typeof record.payload !== "object" ||
    Array.isArray(record.payload)
  ) {
    throw new PersistenceMappingError("Timeline event payload must be an object", "payload");
  }

  return {
    id: record.id,
    tripId: record.tripId,
    type: record.type,
    payload: record.payload as Record<string, unknown>,
    occurredAt: toIsoString(record.occurredAt),
    createdAt: toIsoString(record.createdAt),
  };
}
