import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  DETERIORATED_MARINE,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

export const S004_WAVE_CHANGE_NO_CONCERN: RiskScenario = {
  id: "S004",
  name: "Wave increase + no concern",
  description:
    "Same marine deterioration as S003 but without active concerns. Material environmental change only.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: DETERIORATED_MARINE,
    activeConcerns: [],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 2,
    expectedDeltaTypes: ["VALUE_INCREASED", "VALUE_INCREASED"],
    expectedDeltaConcepts: ["WAVE_CONDITIONS", "WIND_CONDITIONS"],
    expectedReassessmentRequired: true,
    expectedReassessmentReason: "MATERIAL_ENVIRONMENTAL_CHANGE",
    expectedTriggerConcepts: ["WAVE_CONDITIONS"],
    expectedMeasurementDeltas: [
      {
        measurement: "WAVE_HEIGHT_M",
        type: "VALUE_INCREASED",
        signedChange: 0.7,
        absoluteChange: 0.7,
        reassessmentRelevant: true,
      },
      {
        measurement: "WIND_SPEED_KMH",
        type: "VALUE_INCREASED",
        signedChange: 5,
        absoluteChange: 5,
        reassessmentRelevant: false,
      },
    ],
    expectedOperationalAction: "REASSESSMENT_REQUIRED",
  },
};
