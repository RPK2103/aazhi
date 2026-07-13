import type { RiskState } from "../risk-state";
import type { RiskEvent } from "./risk-event";
import { isMarineStateUpdatedEvent } from "./risk-event";

export class RiskEventTripMismatchError extends Error {
  constructor(eventTripId: string, stateTripId: string) {
    super(
      `Risk event trip mismatch: event targets ${eventTripId} but current state belongs to ${stateTripId}`,
    );
    this.name = "RiskEventTripMismatchError";
  }
}

function copyRiskState(state: RiskState): RiskState {
  return {
    tripContext: { ...state.tripContext },
    marineState: { ...state.marineState },
    activeConcerns: state.activeConcerns.map((concern) => ({ ...concern })),
    posture: state.posture,
    lastEvaluatedAt: state.lastEvaluatedAt,
    version: state.version,
  };
}

/**
 * Pure application of a normalized risk event to the current factual state.
 * Does not increment version, update lastEvaluatedAt, or mutate the input state.
 */
export function applyRiskEvent(currentState: RiskState, event: RiskEvent): RiskState {
  if (event.tripId !== currentState.tripContext.tripId) {
    throw new RiskEventTripMismatchError(event.tripId, currentState.tripContext.tripId);
  }

  const candidate = copyRiskState(currentState);

  if (isMarineStateUpdatedEvent(event)) {
    candidate.marineState = { ...event.marineState };
  }

  return candidate;
}
