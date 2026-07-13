import type { RiskPosture } from "@/domain/risk";
import type { AttentionGroup } from "./attention-types";

/**
 * Internal deterministic posture priority — lower numeric value = higher attention.
 * Not exposed as a risk score or AI-derived metric.
 */
const RISK_POSTURE_ATTENTION_PRIORITY: Record<RiskPosture, number> = {
  OFFICIAL_ALERT_PRIORITY: 0,
  COORDINATOR_REVIEW_REQUIRED: 1,
  REASSESSMENT_REQUIRED: 2,
  CAUTION: 3,
  BASELINE: 4,
};

export function getRiskPostureAttentionPriority(posture: RiskPosture): number {
  return RISK_POSTURE_ATTENTION_PRIORITY[posture];
}

export function getAttentionGroupFromPosture(posture: RiskPosture): AttentionGroup {
  switch (posture) {
    case "OFFICIAL_ALERT_PRIORITY":
    case "COORDINATOR_REVIEW_REQUIRED":
    case "REASSESSMENT_REQUIRED":
      return "ATTENTION_REQUIRED";
    case "CAUTION":
      return "WATCH";
    case "BASELINE":
      return "STABLE";
  }
}
