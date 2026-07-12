import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  communicationConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const comm = communicationConcern("concern-comm-s012", "OPEN");

/**
 * Future regression target after check-in event modelling exists.
 * Under current semantics: active concern retained, no deltas, no reassessment.
 */
export const S012_MISSED_CHECK_IN_COMMS_CONCERN: RiskScenario = {
  id: "S012",
  name: "Missed check-in + communication concern",
  description:
    "COMMUNICATION_REDUNDANCY OPEN with CHECK_IN_EVENT_NOT_YET_MODELLED capability gap.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  knownCapabilityGaps: ["CHECK_IN_EVENT_NOT_YET_MODELLED"],
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedActiveConcernConcepts: ["COMMUNICATION_REDUNDANCY"],
  },
};
