import type {
  MarineRiskState,
  RiskConcept,
  RiskPosture,
  RiskState,
  TripContext,
  VesselConcern,
} from "@/domain/risk";

/** Stable synthetic timestamps — never use Date.now() in eval fixtures. */
export const EVAL_PREVIOUS_EVALUATED_AT = "2026-07-12T06:00:00.000Z";
export const EVAL_CURRENT_EVALUATED_AT = "2026-07-12T07:00:00.000Z";
export const EVAL_MARINE_CAPTURED_AT_PREVIOUS = "2026-07-12T05:55:00.000Z";
export const EVAL_MARINE_CAPTURED_AT_CURRENT = "2026-07-12T06:55:00.000Z";
export const EVAL_CONCERN_REPORTED_AT = "2026-07-12T05:30:00.000Z";

export const EVAL_VESSEL_ID = "TN-04";
export const EVAL_TRIP_ID = "trip-eval-tn04";

/** Stable marine baseline used across multiple scenarios. */
export const STABLE_MARINE: MarineRiskState = {
  waveHeightM: 0.8,
  wavePeriodS: 6,
  windSpeedKmh: 13,
  windDirectionDeg: 180,
  capturedAt: EVAL_MARINE_CAPTURED_AT_PREVIOUS,
};

/** Marine state after S003/S004 wave and wind deterioration. */
export const DETERIORATED_MARINE: MarineRiskState = {
  waveHeightM: 1.5,
  wavePeriodS: 6,
  windSpeedKmh: 18,
  windDirectionDeg: 180,
  capturedAt: EVAL_MARINE_CAPTURED_AT_CURRENT,
};

export function buildMarineState(
  partial: Partial<MarineRiskState> & Pick<MarineRiskState, "capturedAt">,
): MarineRiskState {
  return {
    waveHeightM: null,
    wavePeriodS: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    ...partial,
  };
}

export function buildTripContext(
  partial: Partial<TripContext> = {},
): TripContext {
  return {
    tripId: EVAL_TRIP_ID,
    vesselId: EVAL_VESSEL_ID,
    crewCount: 5,
    plannedDurationHours: 8,
    tripStatus: "ACTIVE",
    ...partial,
  };
}

export function buildConcern(
  partial: Partial<VesselConcern> &
    Pick<VesselConcern, "id" | "concept" | "status">,
): VesselConcern {
  return {
    vesselId: EVAL_VESSEL_ID,
    summary: "Synthetic eval concern.",
    reportedAt: EVAL_CONCERN_REPORTED_AT,
    ...partial,
  };
}

export function buildRiskState(options: {
  marineState: MarineRiskState;
  activeConcerns?: readonly VesselConcern[];
  posture?: RiskPosture;
  lastEvaluatedAt: string;
  version: number;
  tripContext?: TripContext;
}): RiskState {
  return {
    tripContext: options.tripContext ?? buildTripContext(),
    marineState: options.marineState,
    activeConcerns: options.activeConcerns ?? [],
    posture: options.posture ?? "CAUTION",
    lastEvaluatedAt: options.lastEvaluatedAt,
    version: options.version,
  };
}

export function engineConcern(
  id: string,
  status: VesselConcern["status"],
): VesselConcern {
  return buildConcern({
    id,
    concept: "ENGINE_RELIABILITY",
    status,
    summary: "Engine stopped twice and required restart.",
  });
}

export function communicationConcern(
  id: string,
  status: VesselConcern["status"],
): VesselConcern {
  return buildConcern({
    id,
    concept: "COMMUNICATION_REDUNDANCY",
    status,
    summary: "Secondary communication device unavailable.",
  });
}

export function activeConcernConcepts(
  concerns: readonly VesselConcern[],
): RiskConcept[] {
  return concerns
    .filter((c) => c.status === "OPEN" || c.status === "RESOLUTION_REPORTED")
    .map((c) => c.concept);
}
