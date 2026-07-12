export const TRIP_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

/**
 * Operational trip identity and planning context.
 * Timestamps are ISO strings when present; omitted fields remain optional.
 */
export interface TripContext {
  tripId: string;
  vesselId: string;
  crewCount: number;
  plannedDurationHours: number;
  tripStatus: TripStatus;
  startedAt?: string;
  expectedReturnAt?: string;
  endedAt?: string;
}
