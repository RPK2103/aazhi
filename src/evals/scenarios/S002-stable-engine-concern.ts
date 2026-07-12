import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  engineConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const engine = engineConcern("concern-engine-s002", "OPEN");

export const S002_STABLE_ENGINE_CONCERN: RiskScenario = {
  id: "S002",
  name: "Stable sea + engine concern",
  description:
    "Same marine state and same OPEN ENGINE_RELIABILITY concern. Active concern alone does not retrigger reassessment.",
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
