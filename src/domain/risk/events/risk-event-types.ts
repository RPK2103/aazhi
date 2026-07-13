/**
 * Bounded runtime-backed risk event vocabulary for Phase 8 orchestration.
 */
export const RISK_EVENT_TYPES = ["MARINE_STATE_UPDATED"] as const;

export type RiskEventType = (typeof RISK_EVENT_TYPES)[number];

const RISK_EVENT_TYPE_SET: ReadonlySet<string> = new Set(RISK_EVENT_TYPES);

export function isRiskEventType(value: string): value is RiskEventType {
  return RISK_EVENT_TYPE_SET.has(value);
}
