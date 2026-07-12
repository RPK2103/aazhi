import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  engineConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const engine = engineConcern("concern-engine-s007", "OPEN");

export const S007_CONCERN_CARRIED_FORWARD: RiskScenario = {
  id: "S007",
  name: "Unresolved concern carried forward",
  description:
    "Same ENGINE_RELIABILITY concern ID and OPEN status with no marine change. Evaluates concern carry-forward representation.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [engine],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [engine],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedActiveConcernConcepts: ["ENGINE_RELIABILITY"],
  },
};
