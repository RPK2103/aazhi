/**
 * Bounded operational risk-concept vocabulary for AAZHI.
 * Compile-time safe; single runtime source of truth for later policy/evals.
 */
export const RISK_CONCEPTS = [
  "ENGINE_RELIABILITY",
  "HULL_INTEGRITY",
  "VESSEL_STABILITY",
  "PRIMARY_COMMUNICATION",
  "COMMUNICATION_REDUNDANCY",
  "SAFETY_EQUIPMENT",
  "WAVE_CONDITIONS",
  "WIND_CONDITIONS",
  "OFFICIAL_ALERT",
  "TRIP_DURATION",
  "CHECK_IN_STATUS",
] as const;

export type RiskConcept = (typeof RISK_CONCEPTS)[number];

const RISK_CONCEPT_SET: ReadonlySet<string> = new Set(RISK_CONCEPTS);

export function isRiskConcept(value: string): value is RiskConcept {
  return RISK_CONCEPT_SET.has(value);
}
