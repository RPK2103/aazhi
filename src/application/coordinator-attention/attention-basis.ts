import type { RiskPosture, VesselConcern } from "@/domain/risk";
import { isActiveConcern } from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy/operational-actions";
import type { TimelineEventRecord } from "@/application/persistence/persistence-models";
import type { ActiveTripProcessingTraceDto } from "@/application/active-trip/active-trip-dto";
import { mapProcessingTraceFromPayload } from "@/application/active-trip/timeline-dto";
import type { AttentionBasisKind } from "./attention-types";

export interface AttentionRelevantTrace {
  eventId: string;
  occurredAt: string;
  trace: ActiveTripProcessingTraceDto;
}

export interface AttentionBasisProjection {
  kind: AttentionBasisKind;
  currentPosture: RiskPosture;
  activeConcernConcepts: readonly VesselConcern["concept"][];
  materialDeltas: ActiveTripProcessingTraceDto["deltas"];
  reassessmentDecision: ActiveTripProcessingTraceDto["reassessmentDecision"] | null;
  policyAction: OperationalAction | null;
  interpretationStatus: ActiveTripProcessingTraceDto["interpretationStatus"] | null;
  interpretation: ActiveTripProcessingTraceDto["interpretation"];
  occurredAt: string;
}

export function isAttentionRelevantProcessingTrace(
  trace: ActiveTripProcessingTraceDto,
): boolean {
  return (
    trace.reassessmentDecision.required === true ||
    trace.policyDecision.action !== "NO_ACTION_REQUIRED" ||
    trace.previousPosture !== trace.currentPosture
  );
}

export function findLatestProcessingTraceEvent(
  events: readonly TimelineEventRecord[],
): AttentionRelevantTrace | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "RISK_EVENT_PROCESSED") {
      return {
        eventId: event.id,
        occurredAt: event.occurredAt,
        trace: mapProcessingTraceFromPayload(event.payload),
      };
    }
  }
  return null;
}

export function findLatestAttentionRelevantTrace(
  events: readonly TimelineEventRecord[],
): AttentionRelevantTrace | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type !== "RISK_EVENT_PROCESSED") {
      continue;
    }

    const trace = mapProcessingTraceFromPayload(event.payload);
    if (isAttentionRelevantProcessingTrace(trace)) {
      return {
        eventId: event.id,
        occurredAt: event.occurredAt,
        trace,
      };
    }
  }
  return null;
}

export function findLatestManualCheckAt(
  events: readonly TimelineEventRecord[],
): string | null {
  return findLatestProcessingTraceEvent(events)?.occurredAt ?? null;
}

export function deriveActiveConcernConcepts(
  activeConcerns: readonly VesselConcern[],
): readonly VesselConcern["concept"][] {
  return activeConcerns
    .filter(isActiveConcern)
    .map((concern) => concern.concept);
}

export function deriveAttentionBasis(options: {
  currentPosture: RiskPosture;
  activeConcerns: readonly VesselConcern[];
  lastEvaluatedAt: string;
  attentionRelevantTrace: AttentionRelevantTrace | null;
}): AttentionBasisProjection {
  const activeConcernConcepts = deriveActiveConcernConcepts(options.activeConcerns);

  if (options.attentionRelevantTrace) {
    const { trace, occurredAt } = options.attentionRelevantTrace;
    const materialDeltas = trace.deltas.filter(
      (delta) => delta.type !== "VALUE_UNCHANGED",
    );

    return {
      kind: "PROCESSING_TRACE",
      currentPosture: options.currentPosture,
      activeConcernConcepts,
      materialDeltas,
      reassessmentDecision: trace.reassessmentDecision,
      policyAction: trace.policyDecision.action,
      interpretationStatus: trace.interpretationStatus,
      interpretation: trace.interpretation,
      occurredAt,
    };
  }

  return {
    kind: "PERSISTED_STATE",
    currentPosture: options.currentPosture,
    activeConcernConcepts,
    materialDeltas: [],
    reassessmentDecision: null,
    policyAction: null,
    interpretationStatus: null,
    interpretation: null,
    occurredAt: options.lastEvaluatedAt,
  };
}
