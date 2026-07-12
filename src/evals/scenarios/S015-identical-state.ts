import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const identicalState = buildRiskState({
  marineState: STABLE_MARINE,
  activeConcerns: [],
  lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
  version: 1,
});

export const S015_IDENTICAL_STATE: RiskScenario = {
  id: "S015",
  name: "Identical state",
  description:
    "Structurally equivalent previous and current RiskState with no active concerns.",
  previousState: identicalState,
  currentState: identicalState,
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedOperationalAction: "NO_ACTION_REQUIRED",
  },
};
