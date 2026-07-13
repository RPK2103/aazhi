import { describe, expect, it } from "vitest";
import { deriveNextRiskPosture } from "./risk-posture-transition";
import type { RiskPosture } from "@/domain/risk";

describe("deriveNextRiskPosture", () => {
  it("retains current posture for NO_ACTION_REQUIRED", () => {
    const postures: RiskPosture[] = [
      "BASELINE",
      "CAUTION",
      "REASSESSMENT_REQUIRED",
      "COORDINATOR_REVIEW_REQUIRED",
      "OFFICIAL_ALERT_PRIORITY",
    ];

    for (const posture of postures) {
      expect(
        deriveNextRiskPosture(posture, { action: "NO_ACTION_REQUIRED" }),
      ).toBe(posture);
    }
  });

  it("maps REASSESSMENT_REQUIRED policy to REASSESSMENT_REQUIRED posture", () => {
    expect(
      deriveNextRiskPosture("CAUTION", { action: "REASSESSMENT_REQUIRED" }),
    ).toBe("REASSESSMENT_REQUIRED");
  });

  it("maps COORDINATOR_REVIEW_REQUIRED policy to COORDINATOR_REVIEW_REQUIRED posture", () => {
    expect(
      deriveNextRiskPosture("CAUTION", { action: "COORDINATOR_REVIEW_REQUIRED" }),
    ).toBe("COORDINATOR_REVIEW_REQUIRED");
  });

  it("maps OFFICIAL_ALERT_PRIORITY policy to OFFICIAL_ALERT_PRIORITY posture", () => {
    expect(
      deriveNextRiskPosture("CAUTION", { action: "OFFICIAL_ALERT_PRIORITY" }),
    ).toBe("OFFICIAL_ALERT_PRIORITY");
  });

  it("maps S003 CAUTION + COORDINATOR_REVIEW_REQUIRED to COORDINATOR_REVIEW_REQUIRED", () => {
    expect(
      deriveNextRiskPosture("CAUTION", { action: "COORDINATOR_REVIEW_REQUIRED" }),
    ).toBe("COORDINATOR_REVIEW_REQUIRED");
  });
});
