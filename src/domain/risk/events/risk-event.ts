import type { MarineRiskState } from "../marine-risk-state";

/**
 * Normalized factual marine-state update for an active trip.
 * Contains no provider JSON, policy data, or AI artifacts.
 */
export interface MarineStateUpdatedEvent {
  id: string;
  tripId: string;
  type: "MARINE_STATE_UPDATED";
  occurredAt: string;
  marineState: MarineRiskState;
}

export type RiskEvent = MarineStateUpdatedEvent;

export function isMarineStateUpdatedEvent(event: RiskEvent): event is MarineStateUpdatedEvent {
  return event.type === "MARINE_STATE_UPDATED";
}
