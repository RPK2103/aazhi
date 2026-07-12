import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  engineConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const previousEngine = engineConcern("concern-engine-s009", "OPEN");
const reportedEngine = engineConcern("concern-engine-s009", "RESOLUTION_REPORTED");

export const S009_RESOLUTION_REPORTED: RiskScenario = {
  id: "S009",
  name: "Resolution reported",
  description:
    "ENGINE_RELIABILITY transitions from OPEN to RESOLUTION_REPORTED. Concern remains active; reassessment required.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [previousEngine],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [reportedEngine],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 1,
    expectedDeltaTypes: ["CONCERN_STATUS_CHANGED"],
    expectedDeltaConcepts: ["ENGINE_RELIABILITY"],
    expectedReassessmentRequired: true,
    expectedReassessmentReason: "CONCERN_STATE_CHANGED",
    expectedTriggerConcepts: ["ENGINE_RELIABILITY"],
    expectedActiveConcernConcepts: ["ENGINE_RELIABILITY"],
    expectedOperationalAction: "REASSESSMENT_REQUIRED",
  },
};
