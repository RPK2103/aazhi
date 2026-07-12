import type { RiskState } from "../risk-state";
import { calculateConcernDeltas } from "./concern-delta";
import { calculateMarineDeltas } from "./marine-delta";
import type { RiskDelta } from "./delta-types";
import {
  DEFAULT_REASSESSMENT_SENSITIVITY,
  type ReassessmentSensitivity,
} from "./reassessment-sensitivity";

/**
 * Compares previous and current risk states and returns meaningful changes only.
 *
 * Unchanged marine measurements and unchanged concerns are omitted.
 * VALUE_UNCHANGED and CONCERN_UNCHANGED never appear in the aggregate result.
 * Identical risk states produce an empty array.
 *
 * Output order:
 * 1. Marine measurement deltas in fixed measurement order
 * 2. Concern deltas sorted by concern ID
 */
export function calculateRiskDeltas(
  previous: RiskState,
  current: RiskState,
  sensitivity: ReassessmentSensitivity = DEFAULT_REASSESSMENT_SENSITIVITY,
): readonly RiskDelta[] {
  const detectedAt = current.lastEvaluatedAt;

  const marineDeltas = calculateMarineDeltas(
    previous.marineState,
    current.marineState,
    detectedAt,
    sensitivity,
  );

  const concernDeltas = calculateConcernDeltas(
    previous.activeConcerns,
    current.activeConcerns,
    detectedAt,
  );

  return [...marineDeltas, ...concernDeltas];
}
