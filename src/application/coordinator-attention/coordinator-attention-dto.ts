import type {
  MarineReferenceLocation,
  RiskPosture,
  VesselConcern,
} from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy/operational-actions";
import type { InterpretationStatus } from "@/application/risk-orchestrator";
import type { AttentionBasisKind, AttentionGroup } from "./attention-types";
import type { AttentionBasisProjection } from "./attention-basis";

export const COORDINATOR_MANUAL_MONITORING_NOTICE =
  "AAZHI is not continuously monitoring these trips. Attention reflects recorded trip state and manually processed updates.";

export interface AttentionBasisDto {
  kind: AttentionBasisKind;
  currentPosture: RiskPosture;
  activeConcernConcepts: readonly VesselConcern["concept"][];
  materialDeltas: AttentionBasisProjection["materialDeltas"];
  reassessmentDecision: AttentionBasisProjection["reassessmentDecision"];
  policyAction: OperationalAction | null;
  interpretationStatus: InterpretationStatus | null;
  interpretation: AttentionBasisProjection["interpretation"];
  occurredAt: string;
}

export interface CoordinatorTripAttentionDTO {
  tripId: string;
  vesselId: string;
  tripStatus: string;
  vesselDisplayName: string;
  registrationReference: string | null;
  vesselType: string;
  marineReferenceLocation: MarineReferenceLocation;
  crewCount: number;
  plannedDurationHours: number;
  startedAt: string | null;
  expectedReturnAt: string | null;
  currentPosture: RiskPosture;
  attentionGroup: AttentionGroup;
  activeConcerns: readonly VesselConcern[];
  stateVersion: number;
  riskStateRecordedAt: string;
  latestManualCheckAt: string | null;
  latestPolicyAction: OperationalAction | null;
  attentionBasis: AttentionBasisDto;
  latestProcessingInterpretationStatus: InterpretationStatus | null;
  /** Internal sort key — occurredAt of latest attention-relevant trace, or null. */
  attentionRelevantTraceOccurredAt: string | null;
}

export interface CoordinatorAttentionSummary {
  totalActiveTrips: number;
  attentionRequiredCount: number;
  watchCount: number;
  stableCount: number;
  notCheckedYetCount: number;
}

export interface CoordinatorAttentionDTO {
  generatedAt: string;
  summary: CoordinatorAttentionSummary;
  attentionRequired: readonly CoordinatorTripAttentionDTO[];
  watch: readonly CoordinatorTripAttentionDTO[];
  stable: readonly CoordinatorTripAttentionDTO[];
  manualMonitoringNotice: string;
}
