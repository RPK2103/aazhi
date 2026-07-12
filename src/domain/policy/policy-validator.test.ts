import { describe, expect, it } from "vitest";
import type { OperationalPolicyDecision } from "./policy-types";
import { validateOperationalActionCandidate } from "./policy-validator";

function makePolicyDecision(
  action: OperationalPolicyDecision["action"],
): OperationalPolicyDecision {
  return {
    action,
    reason:
      action === "NO_ACTION_REQUIRED"
        ? "NO_MATERIAL_CHANGE"
        : action === "COORDINATOR_REVIEW_REQUIRED"
          ? "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN"
          : action === "OFFICIAL_ALERT_PRIORITY"
            ? "OFFICIAL_ALERT_CHANGED"
            : "REASSESSMENT_REQUIRED",
    triggerConcepts: [],
    derivedAt: "2026-07-12T10:00:00.000Z",
  };
}

describe("validateOperationalActionCandidate", () => {
  const coordinatorDecision = makePolicyDecision("COORDINATOR_REVIEW_REQUIRED");

  it("accepts matching supported candidate", () => {
    const result = validateOperationalActionCandidate(
      "COORDINATOR_REVIEW_REQUIRED",
      coordinatorDecision,
    );
    expect(result.valid).toBe(true);
    expect(result.candidateAction).toBe("COORDINATOR_REVIEW_REQUIRED");
    expect(result.violation).toBeNull();
    expect(result.fallbackAction).toBe("COORDINATOR_REVIEW_REQUIRED");
  });

  it("rejects mismatched supported candidate with ACTION_POLICY_MISMATCH", () => {
    const result = validateOperationalActionCandidate(
      "REASSESSMENT_REQUIRED",
      coordinatorDecision,
    );
    expect(result.valid).toBe(false);
    expect(result.candidateAction).toBe("REASSESSMENT_REQUIRED");
    expect(result.violation).toBe("ACTION_POLICY_MISMATCH");
    expect(result.fallbackAction).toBe("COORDINATOR_REVIEW_REQUIRED");
  });

  it("rejects unsupported candidate with UNSUPPORTED_ACTION", () => {
    const result = validateOperationalActionCandidate(
      "RETURN_TO_SHORE_IMMEDIATELY",
      coordinatorDecision,
    );
    expect(result.valid).toBe(false);
    expect(result.candidateAction).toBeNull();
    expect(result.violation).toBe("UNSUPPORTED_ACTION");
    expect(result.candidateLabel).toBe("RETURN_TO_SHORE_IMMEDIATELY");
    expect(result.fallbackAction).toBe("COORDINATOR_REVIEW_REQUIRED");
  });

  it("does not promote unsupported candidate to OperationalAction", () => {
    const result = validateOperationalActionCandidate(
      "RETURN_TO_SHORE",
      coordinatorDecision,
    );
    expect(result.candidateAction).toBeNull();
  });

  it("uses deterministic expected action as mismatch fallback", () => {
    const result = validateOperationalActionCandidate(
      "REASSESSMENT_REQUIRED",
      coordinatorDecision,
    );
    expect(result.fallbackAction).toBe(coordinatorDecision.action);
  });

  it("uses deterministic expected action as unsupported fallback", () => {
    const result = validateOperationalActionCandidate(
      "CONTINUE_TRIP",
      coordinatorDecision,
    );
    expect(result.fallbackAction).toBe(coordinatorDecision.action);
  });

  it("accepts NO_ACTION_REQUIRED when expected", () => {
    const decision = makePolicyDecision("NO_ACTION_REQUIRED");
    const result = validateOperationalActionCandidate(
      "NO_ACTION_REQUIRED",
      decision,
    );
    expect(result.valid).toBe(true);
    expect(result.violation).toBeNull();
  });

  it("rejects OFFICIAL_ALERT_PRIORITY when REASSESSMENT_REQUIRED expected", () => {
    const decision = makePolicyDecision("REASSESSMENT_REQUIRED");
    const result = validateOperationalActionCandidate(
      "OFFICIAL_ALERT_PRIORITY",
      decision,
    );
    expect(result.valid).toBe(false);
    expect(result.violation).toBe("ACTION_POLICY_MISMATCH");
    expect(result.fallbackAction).toBe("REASSESSMENT_REQUIRED");
  });

  it("accepts OFFICIAL_ALERT_PRIORITY when expected", () => {
    const decision = makePolicyDecision("OFFICIAL_ALERT_PRIORITY");
    const result = validateOperationalActionCandidate(
      "OFFICIAL_ALERT_PRIORITY",
      decision,
    );
    expect(result.valid).toBe(true);
    expect(result.violation).toBeNull();
  });
});
