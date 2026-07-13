/**
 * Bounded timeline event vocabulary for Phase 7 persistence.
 * Phase 8 will extend event modelling; do not add future event types here yet.
 */
export const TIMELINE_EVENT_TYPES = [
  "TRIP_CREATED",
  "CONCERN_CARRIED_FORWARD",
  "RISK_STATE_SNAPSHOT_CREATED",
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

const TIMELINE_EVENT_TYPE_SET: ReadonlySet<string> = new Set(TIMELINE_EVENT_TYPES);

export function isTimelineEventType(value: string): value is TimelineEventType {
  return TIMELINE_EVENT_TYPE_SET.has(value);
}

export interface TimelineEventRecord {
  id: string;
  tripId: string;
  type: TimelineEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface PersistedVessel {
  id: string;
  displayName: string;
  registrationReference: string | null;
  vesselType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedTrip {
  id: string;
  vesselId: string;
  crewCount: number;
  plannedDurationHours: number;
  status: string;
  startedAt: string | null;
  expectedReturnAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripRiskStateSnapshotRecord {
  id: string;
  tripId: string;
  version: number;
  posture: string;
  stateJson: unknown;
  lastEvaluatedAt: string;
  createdAt: string;
}
