import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  buildTripContext,
  communicationConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const comm = communicationConcern("concern-comm-s005", "OPEN");
const shortTrip = buildTripContext({ plannedDurationHours: 2 });

export const S005_MISSING_COMMS_SHORT_TRIP: RiskScenario = {
  id: "S005",
  name: "Missing communication concern + short trip",
  description:
    "COMMUNICATION_REDUNDANCY OPEN on a 2-hour trip with unchanged marine state. Concern presence alone does not retrigger reassessment.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
    tripContext: shortTrip,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
    tripContext: shortTrip,
  }),
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedActiveConcernConcepts: ["COMMUNICATION_REDUNDANCY"],
    expectedOperationalAction: "NO_ACTION_REQUIRED",
  },
};
