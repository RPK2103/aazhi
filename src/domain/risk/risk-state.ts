import type { VesselConcern } from "./concern";
import type { MarineRiskState } from "./marine-risk-state";
import type { RiskPosture } from "./risk-posture";
import type { TripContext } from "./trip-context";

/**
 * Complete operational risk state for a trip.
 * Types only in Phase 1 — no persistence, reducers, or event application.
 */
export interface RiskState {
  tripContext: TripContext;
  marineState: MarineRiskState;
  activeConcerns: readonly VesselConcern[];
  posture: RiskPosture;
  /** ISO timestamp of last evaluation. */
  lastEvaluatedAt: string;
  /** Positive integer revision of this risk state. */
  version: number;
}

/**
 * Risk state versions must be positive integers (1, 2, 3, …).
 * Rejects zero, negatives, non-integers, and non-finite values.
 */
export function isValidRiskStateVersion(version: number): boolean {
  return Number.isInteger(version) && version > 0;
}
