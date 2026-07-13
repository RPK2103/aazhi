import type { RiskConcept } from "./risk-concepts";

/**
 * Lifecycle statuses for a known vessel concern.
 *
 * RESOLUTION_REPORTED means a fisher (or other source) claimed the issue
 * may be fixed. It is NOT the same as RESOLVED — confirmation is separate.
 */
export const CONCERN_STATUSES = [
  "OPEN",
  "RESOLUTION_REPORTED",
  "RESOLVED",
  "DISMISSED",
] as const;

export type ConcernStatus = (typeof CONCERN_STATUSES)[number];

const CONCERN_STATUS_SET: ReadonlySet<string> = new Set(CONCERN_STATUSES);

export function isConcernStatus(value: string): value is ConcernStatus {
  return CONCERN_STATUS_SET.has(value);
}

/** Statuses that keep a concern in the active operational set. */
export const ACTIVE_CONCERN_STATUSES = ["OPEN", "RESOLUTION_REPORTED"] as const;

export type ActiveConcernStatus = (typeof ACTIVE_CONCERN_STATUSES)[number];

/**
 * Provider-independent vessel concern record.
 * Timestamps follow the codebase ISO string convention.
 */
export interface VesselConcern {
  id: string;
  vesselId: string;
  concept: RiskConcept;
  summary: string;
  status: ConcernStatus;
  reportedAt: string;
  resolutionReportedAt?: string;
  resolvedAt?: string;
  dismissedAt?: string;
}

const ALLOWED_CONCERN_TRANSITIONS: Readonly<
  Record<ConcernStatus, ReadonlySet<ConcernStatus>>
> = {
  OPEN: new Set(["OPEN", "RESOLUTION_REPORTED", "RESOLVED", "DISMISSED"]),
  RESOLUTION_REPORTED: new Set([
    "RESOLUTION_REPORTED",
    "RESOLVED",
    "OPEN",
    "DISMISSED",
  ]),
  RESOLVED: new Set(["RESOLVED", "OPEN"]),
  DISMISSED: new Set(["DISMISSED", "OPEN"]),
};

/**
 * Pure deterministic check: whether a concern status transition is allowed.
 * Same-state transitions are treated as valid idempotent no-ops.
 * Does not mutate concerns or encode authority rules.
 */
export function canTransitionConcernStatus(
  from: ConcernStatus,
  to: ConcernStatus,
): boolean {
  return ALLOWED_CONCERN_TRANSITIONS[from].has(to);
}

export function isActiveConcern(concern: {
  status: ConcernStatus;
}): boolean {
  return (
    concern.status === "OPEN" || concern.status === "RESOLUTION_REPORTED"
  );
}
