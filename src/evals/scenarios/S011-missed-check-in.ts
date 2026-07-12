import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

/**
 * Missed check-in cannot be represented in current RiskState.
 * This scenario visibly identifies the evaluation boundary.
 */
export const S011_MISSED_CHECK_IN: RiskScenario = {
  id: "S011",
  name: "Missed check-in",
  description:
    "Documents capability gap: CHECK_IN_EVENT_NOT_YET_MODELLED. AAZHI cannot yet evaluate missed check-in conditions.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  knownCapabilityGaps: ["CHECK_IN_EVENT_NOT_YET_MODELLED"],
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedOperationalAction: "NO_ACTION_REQUIRED",
  },
};
