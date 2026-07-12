import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  buildTripContext,
  communicationConcern,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

const comm = communicationConcern("concern-comm-s006", "OPEN");
const longTrip = buildTripContext({ plannedDurationHours: 8 });

export const S006_MISSING_COMMS_LONG_TRIP: RiskScenario = {
  id: "S006",
  name: "Missing communication concern + long trip",
  description:
    "COMMUNICATION_REDUNDANCY OPEN on an 8-hour trip. Documents current capability gap: trip duration is not compared by Phase 2 delta engine.",
  previousState: buildRiskState({
    marineState: STABLE_MARINE,
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_PREVIOUS_EVALUATED_AT,
    version: 1,
    tripContext: longTrip,
  }),
  currentState: buildRiskState({
    marineState: { ...STABLE_MARINE, capturedAt: EVAL_CURRENT_EVALUATED_AT },
    activeConcerns: [comm],
    lastEvaluatedAt: EVAL_CURRENT_EVALUATED_AT,
    version: 2,
    tripContext: longTrip,
  }),
  knownCapabilityGaps: ["TRIP_DURATION_NOT_YET_COMPARED"],
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
    expectedActiveConcernConcepts: ["COMMUNICATION_REDUNDANCY"],
    expectedOperationalAction: "NO_ACTION_REQUIRED",
  },
};
