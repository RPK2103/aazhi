/**
 * Bridge input for converting provider marine readings into MarineRiskState.
 */
export interface MarineNormalizationInput {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  capturedAt: string;
}
