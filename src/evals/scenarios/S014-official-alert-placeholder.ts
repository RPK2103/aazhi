import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

/**
 * Official alert state is not yet modelled in RiskState.
 * Documents the existing evaluation boundary.
 */
export const S014_OFFICIAL_ALERT_PLACEHOLDER: RiskScenario = {
  id: "S014",
  name: "Official alert placeholder",
  description:
    "Documents capability gap: OFFICIAL_ALERT_STATE_NOT_YET_MODELLED. No OFFICIAL_ALERT delta is synthesized.",
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
  knownCapabilityGaps: ["OFFICIAL_ALERT_STATE_NOT_YET_MODELLED"],
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
  },
};
