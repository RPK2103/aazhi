import type { ReassessmentEvaluation, ReassessmentReason } from "@/domain/risk";
import type { OperationalAction } from "./operational-actions";
import type { OperationalPolicyDecision } from "./policy-types";

/**
 * Single deterministic source of truth: reassessment reason → operational action.
 * Exhaustive over all bounded ReassessmentReason values.
 */
export const REASSESSMENT_TO_OPERATIONAL_ACTION: Readonly<
  Record<ReassessmentReason, OperationalAction>
> = {
  NO_MATERIAL_CHANGE: "NO_ACTION_REQUIRED",
  MATERIAL_ENVIRONMENTAL_CHANGE: "REASSESSMENT_REQUIRED",
  MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN: "COORDINATOR_REVIEW_REQUIRED",
  CONCERN_STATE_CHANGED: "REASSESSMENT_REQUIRED",
  OFFICIAL_ALERT_CHANGED: "OFFICIAL_ALERT_PRIORITY",
};

/**
 * Derives a bounded operational policy decision from a deterministic
 * reassessment evaluation. Does not invoke Gemini or parse natural language.
 */
export function deriveOperationalPolicyDecision(
  reassessmentDecision: ReassessmentEvaluation,
  derivedAt: string,
): OperationalPolicyDecision {
  const action = REASSESSMENT_TO_OPERATIONAL_ACTION[reassessmentDecision.reason];

  return {
    action,
    reason: reassessmentDecision.reason,
    triggerConcepts: [...reassessmentDecision.triggerConcepts],
    derivedAt,
  };
}
