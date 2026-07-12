import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  engineConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const previousEngine = engineConcern("concern-engine-s008", "OPEN");
const resolvedEngine = engineConcern("concern-engine-s008", "RESOLVED");

export const S008_CONCERN_RESOLVED: RiskScenario = {
  id: "S008",
  name: "Concern resolved",
  description:
    "ENGINE_RELIABILITY transitions from OPEN to RESOLVED. Expects CONCERN_CLOSED delta and reassessment.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [previousEngine],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [resolvedEngine],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 1,
    expectedDeltaTypes: ["CONCERN_CLOSED"],
    expectedDeltaConcepts: ["ENGINE_RELIABILITY"],
    expectedReassessmentRequired: true,
    expectedReassessmentReason: "CONCERN_STATE_CHANGED",
    expectedTriggerConcepts: ["ENGINE_RELIABILITY"],
    expectedActiveConcernConcepts: [],
    expectedOperationalAction: "REASSESSMENT_REQUIRED",
  },
};
