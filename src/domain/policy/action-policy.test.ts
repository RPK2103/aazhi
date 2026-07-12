import { describe, expect, it } from "vitest";
import {
  REASSESSMENT_REASONS,
  type ReassessmentEvaluation,
} from "@/domain/risk";
import { deriveOperationalPolicyDecision, REASSESSMENT_TO_OPERATIONAL_ACTION } from "./action-policy";
import { isOperationalAction, OPERATIONAL_ACTIONS } from "./operational-actions";

const DERIVED_AT = "2026-07-12T10:00:00.000Z";

function makeReassessment(
  reason: ReassessmentEvaluation["reason"],
  triggerConcepts: ReassessmentEvaluation["triggerConcepts"] = [],
): ReassessmentEvaluation {
  return {
    required: reason !== "NO_MATERIAL_CHANGE",
    reason,
    triggerConcepts,
  };
}

describe("OPERATIONAL_ACTIONS vocabulary", () => {
  it("contains exactly four bounded operational actions", () => {
    expect(OPERATIONAL_ACTIONS).toHaveLength(4);
    expect(OPERATIONAL_ACTIONS).toEqual([
      "NO_ACTION_REQUIRED",
      "REASSESSMENT_REQUIRED",
      "COORDINATOR_REVIEW_REQUIRED",
      "OFFICIAL_ALERT_PRIORITY",
    ]);
  });

  it.each([
    ["NO_ACTION_REQUIRED", true],
    ["REASSESSMENT_REQUIRED", true],
    ["COORDINATOR_REVIEW_REQUIRED", true],
    ["OFFICIAL_ALERT_PRIORITY", true],
    ["RETURN_TO_SHORE", false],
    ["CONTINUE_TRIP", false],
    ["VESSEL_SAFE", false],
  ] as const)("isOperationalAction(%s) is %s", (action, expected) => {
    expect(isOperationalAction(action)).toBe(expected);
  });
});

describe("REASSESSMENT_TO_OPERATIONAL_ACTION mapping", () => {
  it.each([
    ["NO_MATERIAL_CHANGE", "NO_ACTION_REQUIRED"],
    ["MATERIAL_ENVIRONMENTAL_CHANGE", "REASSESSMENT_REQUIRED"],
    [
      "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      "COORDINATOR_REVIEW_REQUIRED",
    ],
    ["CONCERN_STATE_CHANGED", "REASSESSMENT_REQUIRED"],
    ["OFFICIAL_ALERT_CHANGED", "OFFICIAL_ALERT_PRIORITY"],
  ] as const)("maps %s to %s", (reason, action) => {
    expect(REASSESSMENT_TO_OPERATIONAL_ACTION[reason]).toBe(action);
  });

  it("covers every bounded reassessment reason exhaustively", () => {
    for (const reason of REASSESSMENT_REASONS) {
      expect(REASSESSMENT_TO_OPERATIONAL_ACTION[reason]).toBeDefined();
      expect(isOperationalAction(REASSESSMENT_TO_OPERATIONAL_ACTION[reason])).toBe(
        true,
      );
    }
  });
});

describe("deriveOperationalPolicyDecision", () => {
  it("preserves reassessment reason", () => {
    const decision = deriveOperationalPolicyDecision(
      makeReassessment("MATERIAL_ENVIRONMENTAL_CHANGE", ["WAVE_CONDITIONS"]),
      DERIVED_AT,
    );
    expect(decision.reason).toBe("MATERIAL_ENVIRONMENTAL_CHANGE");
  });

  it("preserves trigger concepts", () => {
    const decision = deriveOperationalPolicyDecision(
      makeReassessment("MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN", [
        "ENGINE_RELIABILITY",
        "WAVE_CONDITIONS",
      ]),
      DERIVED_AT,
    );
    expect(decision.triggerConcepts).toEqual([
      "ENGINE_RELIABILITY",
      "WAVE_CONDITIONS",
    ]);
  });

  it("uses explicit derivedAt timestamp", () => {
    const decision = deriveOperationalPolicyDecision(
      makeReassessment("NO_MATERIAL_CHANGE"),
      DERIVED_AT,
    );
    expect(decision.derivedAt).toBe(DERIVED_AT);
  });
});
