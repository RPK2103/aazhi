import type { OperationalAction } from "@/domain/policy/operational-actions";
import type { RiskPosture } from "@/domain/risk";

const POSTURE_BY_POLICY_ACTION: Readonly<Record<OperationalAction, RiskPosture>> = {
  NO_ACTION_REQUIRED: "BASELINE",
  REASSESSMENT_REQUIRED: "REASSESSMENT_REQUIRED",
  COORDINATOR_REVIEW_REQUIRED: "COORDINATOR_REVIEW_REQUIRED",
  OFFICIAL_ALERT_PRIORITY: "OFFICIAL_ALERT_PRIORITY",
};

/**
 * Deterministic posture transition from bounded operational policy.
 * NO_ACTION_REQUIRED retains the current posture; all other actions map directly.
 */
export function deriveNextRiskPosture(
  currentPosture: RiskPosture,
  policyDecision: { action: OperationalAction },
): RiskPosture {
  if (policyDecision.action === "NO_ACTION_REQUIRED") {
    return currentPosture;
  }

  return POSTURE_BY_POLICY_ACTION[policyDecision.action];
}
