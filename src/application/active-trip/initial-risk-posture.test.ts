import { describe, expect, it } from "vitest";
import { ACTION_POSTURES } from "@/lib/types";
import {
  deriveInitialActiveRiskPosture,
  UnknownAssessmentPostureError,
} from "./initial-risk-posture";

describe("deriveInitialActiveRiskPosture", () => {
  it("maps PROCEED WITH CAUTION to CAUTION", () => {
    expect(deriveInitialActiveRiskPosture("PROCEED WITH CAUTION")).toBe("CAUTION");
  });

  it.each([
    "DO NOT DEPART YET",
    "DELAY AND REASSESS",
    "PREPARE BEFORE DEPARTURE",
  ] as const)("maps %s to REASSESSMENT_REQUIRED", (posture) => {
    expect(deriveInitialActiveRiskPosture(posture)).toBe("REASSESSMENT_REQUIRED");
  });

  it("covers every ACTION_POSTURES value", () => {
    for (const posture of ACTION_POSTURES) {
      expect(() => deriveInitialActiveRiskPosture(posture)).not.toThrow();
    }
  });

  it("fails closed on unknown posture", () => {
    expect(() => deriveInitialActiveRiskPosture("UNKNOWN POSTURE")).toThrow(
      UnknownAssessmentPostureError,
    );
  });
});
