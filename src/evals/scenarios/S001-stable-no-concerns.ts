import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const stableState = buildRiskState({
  marineState: STABLE_MARINE,
  activeConcerns: [],
  lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
  version: 1,
});

export const S001_STABLE_NO_CONCERNS: RiskScenario = {
  id: "S001",
  name: "Stable sea + no concern",
  description:
    "Identical marine state with no concerns. Expects no material change.",
  previousState: stableState,
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedOperationalAction: "NO_ACTION_REQUIRED",
  },
};
