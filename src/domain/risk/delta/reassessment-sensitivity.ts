/**
 * Product-configured contextual reassessment sensitivity.
 *
 * These thresholds answer: "Is this environmental state change large enough
 * for AAZHI to reconsider contextual significance?"
 *
 * They are NOT maritime danger thresholds, official safety limits, departure
 * limits, or claims that a given change is unsafe.
 */
export interface ReassessmentSensitivity {
  /** Minimum absolute wave-height change (metres) to mark a delta reassessment-relevant. */
  readonly waveHeightAbsoluteChangeM: number;
  /** Minimum absolute wind-speed change (km/h) to mark a delta reassessment-relevant. */
  readonly windSpeedAbsoluteChangeKmh: number;
}

export const DEFAULT_REASSESSMENT_SENSITIVITY: ReassessmentSensitivity = {
  waveHeightAbsoluteChangeM: 0.5,
  windSpeedAbsoluteChangeKmh: 10,
};
