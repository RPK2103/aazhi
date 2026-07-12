import { isOperationalAction } from "./operational-actions";
import type {
  OperationalActionValidationResult,
  OperationalPolicyDecision,
} from "./policy-types";

function sanitizeCandidateLabel(candidate: unknown): string | null {
  if (typeof candidate !== "string") {
    return candidate === null || candidate === undefined
      ? null
      : String(candidate);
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates an externally supplied action candidate against a deterministic
 * expected policy decision. Returns structured failure for unsupported or
 * mismatched candidates; does not throw for ordinary invalid candidates.
 */
export function validateOperationalActionCandidate(
  candidate: unknown,
  expectedPolicyDecision: OperationalPolicyDecision,
): OperationalActionValidationResult {
  const expectedAction = expectedPolicyDecision.action;
  const fallbackAction = expectedAction;

  if (!isOperationalAction(candidate)) {
    return {
      valid: false,
      candidateAction: null,
      expectedAction,
      violation: "UNSUPPORTED_ACTION",
      fallbackAction,
      candidateLabel: sanitizeCandidateLabel(candidate),
    };
  }

  if (candidate !== expectedAction) {
    return {
      valid: false,
      candidateAction: candidate,
      expectedAction,
      violation: "ACTION_POLICY_MISMATCH",
      fallbackAction,
      candidateLabel: candidate,
    };
  }

  return {
    valid: true,
    candidateAction: candidate,
    expectedAction,
    violation: null,
    fallbackAction,
    candidateLabel: candidate,
  };
}
