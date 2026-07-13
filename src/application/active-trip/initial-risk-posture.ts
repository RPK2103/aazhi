import { ACTION_POSTURES, type AazhiAssessment } from "@/lib/types";
import type { RiskPosture } from "@/domain/risk";

export class UnknownAssessmentPostureError extends Error {
  constructor(posture: string) {
    super(`Unsupported assessment posture for active trip mapping: ${posture}`);
    this.name = "UnknownAssessmentPostureError";
  }
}

type AssessmentPosture = AazhiAssessment["actionPosture"];

const ASSESSMENT_TO_ACTIVE_POSTURE: Record<AssessmentPosture, RiskPosture> = {
  "PROCEED WITH CAUTION": "CAUTION",
  "DO NOT DEPART YET": "REASSESSMENT_REQUIRED",
  "DELAY AND REASSESS": "REASSESSMENT_REQUIRED",
  "PREPARE BEFORE DEPARTURE": "REASSESSMENT_REQUIRED",
};

export function deriveInitialActiveRiskPosture(
  assessmentPosture: string,
): RiskPosture {
  if (!(ACTION_POSTURES as readonly string[]).includes(assessmentPosture)) {
    throw new UnknownAssessmentPostureError(assessmentPosture);
  }

  return ASSESSMENT_TO_ACTIVE_POSTURE[assessmentPosture as AssessmentPosture];
}

export function isProceedWithCautionPosture(assessmentPosture: string): boolean {
  return assessmentPosture === "PROCEED WITH CAUTION";
}
