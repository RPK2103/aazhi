import type { ConcernStatus } from "../concern";
import type { RiskConcept } from "../risk-concepts";

/**
 * Bounded delta-type vocabulary for Phase 2 deterministic change detection.
 * VALUE_UNCHANGED and CONCERN_UNCHANGED exist for focused comparison helpers
 * but are excluded from aggregate calculateRiskDeltas output by default.
 */
export const RISK_DELTA_TYPES = [
  "VALUE_INCREASED",
  "VALUE_DECREASED",
  "VALUE_UNCHANGED",
  "VALUE_BECAME_AVAILABLE",
  "VALUE_BECAME_UNAVAILABLE",
  "CONCERN_OPENED",
  "CONCERN_STATUS_CHANGED",
  "CONCERN_CLOSED",
  "CONCERN_UNCHANGED",
] as const;

export type RiskDeltaType = (typeof RISK_DELTA_TYPES)[number];

/**
 * Identifies which marine measurement field changed within a risk concept.
 */
export const MARINE_MEASUREMENTS = [
  "WAVE_HEIGHT_M",
  "WAVE_PERIOD_S",
  "WIND_SPEED_KMH",
  "WIND_DIRECTION_DEG",
] as const;

export type MarineMeasurement = (typeof MARINE_MEASUREMENTS)[number];

export type MarineMeasurementValue = number | null;
export type ConcernDeltaValue = ConcernStatus | null;

/**
 * Structured deterministic change between two risk-state snapshots.
 * reassessmentRelevant indicates whether the change meets configured
 * contextual-reconsideration sensitivity — not maritime safety.
 */
export interface RiskDelta {
  id: string;
  type: RiskDeltaType;
  concept: RiskConcept;
  previousValue: MarineMeasurementValue | ConcernDeltaValue;
  currentValue: MarineMeasurementValue | ConcernDeltaValue;
  /** Present for numeric marine measurements when both sides are numbers. */
  absoluteChange?: number;
  reassessmentRelevant: boolean;
  detectedAt: string;
  /** Set for marine measurement deltas. */
  measurement?: MarineMeasurement;
  /** Set for concern lifecycle deltas. */
  concernId?: string;
}
