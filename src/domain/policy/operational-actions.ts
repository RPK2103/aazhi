/**
 * Bounded AAZHI workflow attention states.
 *
 * These are not maritime commands, navigation instructions, vessel-safety
 * declarations, or departure clearance. They control workflow attention only.
 */
export const OPERATIONAL_ACTIONS = [
  "NO_ACTION_REQUIRED",
  "REASSESSMENT_REQUIRED",
  "COORDINATOR_REVIEW_REQUIRED",
  "OFFICIAL_ALERT_PRIORITY",
] as const;

export type OperationalAction = (typeof OPERATIONAL_ACTIONS)[number];

const OPERATIONAL_ACTION_SET = new Set<string>(OPERATIONAL_ACTIONS);

/**
 * Returns true when value is a supported bounded operational action.
 */
export function isOperationalAction(value: unknown): value is OperationalAction {
  return typeof value === "string" && OPERATIONAL_ACTION_SET.has(value);
}

/**
 * Operational action semantics (workflow attention, not maritime commands).
 *
 * NO_ACTION_REQUIRED — No new represented deterministic risk-state change
 * currently requires an AAZHI workflow action. Does not mean the vessel is
 * safe, the trip is approved, or conditions are safe.
 *
 * REASSESSMENT_REQUIRED — A represented deterministic state change requires
 * the changed operational context to be reconsidered.
 *
 * COORDINATOR_REVIEW_REQUIRED — AAZHI detected environmental change
 * interacting with active operational concern context; surface for human
 * coordinator attention. Does not direct the vessel.
 *
 * OFFICIAL_ALERT_PRIORITY — A represented authoritative alert state requires
 * highest AAZHI workflow attention priority. Official alert state is not yet
 * modelled in RiskState; the action exists for future policy mapping.
 */
export const OPERATIONAL_ACTION_SEMANTICS: Readonly<
  Record<OperationalAction, string>
> = {
  NO_ACTION_REQUIRED:
    "No new represented deterministic risk-state change currently requires an AAZHI workflow action.",
  REASSESSMENT_REQUIRED:
    "A represented deterministic state change requires the changed operational context to be reconsidered.",
  COORDINATOR_REVIEW_REQUIRED:
    "Environmental change interacting with active operational concern context requires human coordinator attention.",
  OFFICIAL_ALERT_PRIORITY:
    "A represented authoritative alert state requires highest AAZHI workflow attention priority.",
};
