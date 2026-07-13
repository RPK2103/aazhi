import type { ConcernStatus } from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy/operational-actions";
import type {
  AttentionBasisDto,
  CoordinatorTripAttentionDTO,
} from "@/application/coordinator-attention";
import type { ActiveTripProcessingTraceDto } from "@/application/active-trip";
import {
  formatMarineDelta,
  formatOperationalActionLabel,
  getInterpretationPresentation,
} from "@/lib/active-trip-display";

export const COORDINATOR_VIEW_HEADING = "COORDINATOR VIEW";
export const COORDINATOR_VIEW_SUBHEADING =
  "See which active trips require attention based on their recorded risk state, unresolved concerns, and processed state changes.";

export const ATTENTION_REQUIRED_SECTION_COPY =
  "Trips whose current recorded posture requires reassessment, coordinator review, or official-alert priority.";

export const WATCH_SECTION_COPY =
  "Active trips currently recorded in a caution posture.";

export const STABLE_SECTION_COPY =
  "Active trips whose current recorded posture is baseline.";

export const PERSISTED_STATE_ATTENTION_COPY =
  "Current recorded posture requires reassessment. No later material processing trace established a different attention basis.";

export const EMPTY_ATTENTION_REQUIRED_COPY =
  "No trips currently require attention";

export const EMPTY_ATTENTION_REQUIRED_SUPPORT =
  "Based on the currently recorded risk states and processed updates.";

export const EMPTY_ACTIVE_TRIPS_COPY = "NO ACTIVE TRIPS RECORDED";

export const EMPTY_ACTIVE_TRIPS_SUPPORT =
  "Active trip risk states will appear here after a trip is recorded.";

export const REFRESH_VIEW_COPY = "Reload recorded trip attention states.";

export function formatConcernStatusLabel(status: ConcernStatus): string {
  return status === "RESOLUTION_REPORTED" ? "RESOLUTION REPORTED" : status;
}

export function formatCoordinatorManualCheck(
  latestManualCheckAt: string | null,
): string {
  if (!latestManualCheckAt) {
    return "NOT CHECKED YET";
  }

  const date = new Date(latestManualCheckAt);
  if (Number.isNaN(date.getTime())) {
    return "NOT CHECKED YET";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getAttentionBasisExplanation(
  basis: AttentionBasisDto,
): string | null {
  if (basis.kind === "PERSISTED_STATE") {
    return PERSISTED_STATE_ATTENTION_COPY;
  }

  if (basis.reassessmentDecision?.required) {
    return "Triggered contextual reassessment";
  }

  if (basis.policyAction && basis.policyAction !== "NO_ACTION_REQUIRED") {
    return formatOperationalActionLabel(basis.policyAction);
  }

  if (basis.materialDeltas.length > 0) {
    return "Recorded state change established attention basis.";
  }

  return null;
}

export function getAttentionBasisInterpretationPresentation(
  basis: AttentionBasisDto,
): ReturnType<typeof getInterpretationPresentation> {
  if (basis.kind !== "PROCESSING_TRACE") {
    return {
      heading: "CONTEXTUAL EXPLANATION",
      body: null,
      groundingLines: [],
    };
  }

  const trace: ActiveTripProcessingTraceDto = {
    deltas: basis.materialDeltas,
    reassessmentDecision: basis.reassessmentDecision!,
    policyDecision: {
      action: basis.policyAction ?? "NO_ACTION_REQUIRED",
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
      derivedAt: basis.occurredAt,
    },
    interpretationStatus: basis.interpretationStatus ?? "SKIPPED",
    interpretation: basis.interpretation,
    previousPosture: basis.currentPosture,
    currentPosture: basis.currentPosture,
    stateSnapshotCreated: false,
    previousStateVersion: 0,
    newStateVersion: 0,
  };

  if (basis.interpretationStatus === "SKIPPED") {
    return {
      heading: "CONTEXTUAL EXPLANATION",
      body: "No contextual interpretation was generated for this attention basis.",
      groundingLines: [],
    };
  }

  return getInterpretationPresentation(trace);
}

export function getLatestActionStateLabel(
  latestPolicyAction: OperationalAction | null,
): string {
  if (!latestPolicyAction) {
    return "NO NEW AAZHI ACTION";
  }
  return formatOperationalActionLabel(latestPolicyAction);
}

export function getAttentionBasisActionStateLabel(
  basis: AttentionBasisDto,
): string | null {
  if (basis.kind === "PERSISTED_STATE" || !basis.policyAction) {
    return null;
  }
  return formatOperationalActionLabel(basis.policyAction);
}

export function formatMaterialDeltasForDisplay(
  basis: AttentionBasisDto,
): ReturnType<typeof formatMarineDelta>[] {
  return basis.materialDeltas
    .filter((delta) => delta.type !== "VALUE_UNCHANGED")
    .map((delta) => formatMarineDelta(delta));
}

export function getVesselIdentityLabel(trip: CoordinatorTripAttentionDTO): string {
  return trip.vesselDisplayName;
}

export function getAttentionGroupSectionTitle(
  group: CoordinatorTripAttentionDTO["attentionGroup"],
): string {
  switch (group) {
    case "ATTENTION_REQUIRED":
      return "ATTENTION REQUIRED";
    case "WATCH":
      return "WATCH";
    case "STABLE":
      return "STABLE RECORDED STATE";
  }
}
