import type { RiskScenario } from "../eval-types";
import {
  buildRiskState,
  EVAL_CURRENT_EVALUATED_AT,
  EVAL_PREVIOUS_EVALUATED_AT,
  STABLE_MARINE,
} from "../fixtures/risk-state-factory";

/**
 * Check-in events are not yet modelled in RiskState.
 * Executable risk state remains unchanged between previous and current snapshots.
 */
export const S010_NORMAL_CHECK_IN: RiskScenario = {
  id: "S010",
  name: "Normal check-in",
  description:
    "Documents capability gap: CHECK_IN_EVENT_NOT_YET_MODELLED. Risk state is unchanged under current semantics.",
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
  knownCapabilityGaps: ["CHECK_IN_EVENT_NOT_YET_MODELLED"],
  expectations: {
    expectedDeltaCount: 0,
    expectedReassessmentRequired: false,
    expectedReassessmentReason: "NO_MATERIAL_CHANGE",
    expectedTriggerConcepts: [],
  },
};
