/**
 * Active-trip operational risk posture.
 *
 * Separate from legacy assessment `ACTION_POSTURES` / `AazhiAssessment.actionPosture`
 * used by the current pre-departure Gemini assessment path. Do not conflate the two.
 */
export const RISK_POSTURES = [
  "BASELINE",
  "CAUTION",
  "REASSESSMENT_REQUIRED",
  "COORDINATOR_REVIEW_REQUIRED",
  "OFFICIAL_ALERT_PRIORITY",
] as const;

export type RiskPosture = (typeof RISK_POSTURES)[number];

/**
 * Future departure-decision posture vocabulary.
 *
 * Separate from both RiskPosture (active-trip operational state) and the
 * legacy ACTION_POSTURES strings returned by generateAssessment today.
 */
export const DEPARTURE_POSTURES = [
  "DEPARTURE_HOLD",
  "PRE_DEPARTURE_ACTION_REQUIRED",
  "DELAY_AND_REASSESS",
  "CAUTION",
] as const;

export type DeparturePosture = (typeof DEPARTURE_POSTURES)[number];
