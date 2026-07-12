/**
 * Normalized marine measurements for future deterministic comparison.
 * Null means unavailable — never coerce missing provider values to zero.
 * capturedAt uses the codebase ISO string convention (see MarineContext.checkedAt).
 *
 * Does not include deltas, thresholds, or risk scores.
 */
export interface MarineRiskState {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  capturedAt: string;
}
