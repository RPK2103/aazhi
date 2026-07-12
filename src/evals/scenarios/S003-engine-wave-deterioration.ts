import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  DETERIORATED_MARINE,
  engineConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

/**
 * Golden scenario S003 — unresolved engine concern with worsening marine conditions.
 * Source: docs/evaluations/S003-unresolved-engine-worsening-marine-conditions.md
 */
const engine = engineConcern("concern-engine-tn04-s003", "OPEN");

export const S003_ENGINE_WAVE_DETERIORATION: RiskScenario = {
  id: "S003",
  name: "Wave increase + engine concern",
  description:
    "Vessel TN-04 with OPEN ENGINE_RELIABILITY and worsening waves (0.8→1.5 m) and wind (13→18 km/h).",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [engine],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
  }),
  currentState: buildRiskState({
    marineState: DETERIORATED_MARINE,
    activeConcerns: [engine],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
  }),
  expectations: {
    expectedDeltaCount: 2,
    expectedDeltaTypes: ["VALUE_INCREASED", "VALUE_INCREASED"],
    expectedDeltaConcepts: ["WAVE_CONDITIONS", "WIND_CONDITIONS"],
    expectedReassessmentRequired: true,
    expectedReassessmentReason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    expectedTriggerConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
    expectedActiveConcernConcepts: ["ENGINE_RELIABILITY"],
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
    expectedOperationalAction: "COORDINATOR_REVIEW_REQUIRED",
  },
};
