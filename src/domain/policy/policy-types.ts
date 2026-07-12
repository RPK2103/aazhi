import type { ReassessmentReason, RiskConcept } from "@/domain/risk";
import type { OperationalAction } from "./operational-actions";

/**
 * Bounded policy violation types for operational action validation.
 */
export const POLICY_VIOLATION_TYPES = [
  "UNSUPPORTED_ACTION",
  "ACTION_POLICY_MISMATCH",
] as const;

export type PolicyViolationType = (typeof POLICY_VIOLATION_TYPES)[number];

/**
 * Deterministic operational policy decision derived from reassessment state.
 * Does not contain Gemini output, AI explanation, scores, or navigation guidance.
 */
export interface OperationalPolicyDecision {
  action: OperationalAction;
  reason: ReassessmentReason;
  triggerConcepts: readonly RiskConcept[];
  derivedAt: string;
}

/**
 * Structured result from validating an externally supplied action candidate
 * against a deterministic expected policy decision.
 */
export interface OperationalActionValidationResult {
  valid: boolean;
  candidateAction: OperationalAction | null;
  expectedAction: OperationalAction;
  violation: PolicyViolationType | null;
  fallbackAction: OperationalAction;
  /** Sanitized label for diagnostics when candidate is unsupported. */
  candidateLabel: string | null;
}
