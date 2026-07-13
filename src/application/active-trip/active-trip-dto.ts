import type {
  MarineReferenceLocation,
  MarineRiskState,
  RiskPosture,
  VesselConcern,
} from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy/operational-actions";
import type { RiskEventProcessingResult } from "@/application/risk-orchestrator";
import type { ActiveTripTimelineEntry } from "./timeline-dto";

export type { ActiveTripTimelineEntry };

export const MANUAL_MONITORING_NOTICE =
  "Manual update — AAZHI is not continuously monitoring this trip.";

export interface ActiveTripProcessingTraceDto {
  deltas: RiskEventProcessingResult["deltas"];
  reassessmentDecision: RiskEventProcessingResult["reassessmentDecision"];
  policyDecision: RiskEventProcessingResult["policyDecision"];
  interpretationStatus: RiskEventProcessingResult["interpretationStatus"];
  interpretation: RiskEventProcessingResult["interpretation"];
  previousPosture: RiskPosture;
  currentPosture: RiskPosture;
  stateSnapshotCreated: boolean;
  previousStateVersion: number;
  newStateVersion: number;
}

export interface ActiveTripDto {
  tripId: string;
  vesselId: string;
  tripStatus: string;
  crewCount: number;
  plannedDurationHours: number;
  startedAt: string | null;
  expectedReturnAt: string | null;
  marineReferenceLocation: MarineReferenceLocation;
  currentPosture: RiskPosture;
  stateVersion: number;
  lastEvaluatedAt: string;
  currentMarineState: MarineRiskState;
  activeConcerns: readonly VesselConcern[];
  timeline: readonly ActiveTripTimelineEntry[];
  manualMonitoringNotice: string;
  latestProcessingTrace: ActiveTripProcessingTraceDto | null;
  latestPolicyAction: OperationalAction | null;
}

export type ActiveTripStartResponse = Pick<
  ActiveTripDto,
  | "vesselId"
  | "tripId"
  | "tripStatus"
  | "currentPosture"
  | "stateVersion"
  | "lastEvaluatedAt"
  | "marineReferenceLocation"
  | "currentMarineState"
  | "activeConcerns"
  | "manualMonitoringNotice"
>;

export interface RefreshMarineResponse {
  processingResult: RiskEventProcessingResult;
  activeTrip: ActiveTripDto;
}
