import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const baseState = buildRiskState({
  marineState: STABLE_MARINE,
  activeConcerns: [],
  lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
  version: 1,
});

export const S013_IRRELEVANT_STATE_CHANGE: RiskScenario = {
  id: "S013",
  name: "Irrelevant state change",
  description:
    "RiskState.version changes 1→2 while marine state and concerns are unchanged. Proves version-only changes do not trigger reassessment.",
  previousState: baseState,
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
