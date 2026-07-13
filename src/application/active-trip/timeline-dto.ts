import type { TimelineEventRecord } from "@/application/persistence/persistence-models";
import {
  reconstructProcessingResultFromTimelinePayload,
  type RiskEventProcessingResult,
} from "@/application/risk-orchestrator";
import type { ActiveTripProcessingTraceDto } from "./active-trip-dto";

export interface ActiveTripTimelineEntry {
  id: string;
  type: TimelineEventRecord["type"];
  occurredAt: string;
  title: string;
  summary: string;
  processingTrace?: ActiveTripProcessingTraceDto;
}

function titleForTimelineType(type: TimelineEventRecord["type"]): string {
  switch (type) {
    case "TRIP_CREATED":
      return "Trip recorded as active";
    case "CONCERN_CARRIED_FORWARD":
      return "Concern carried into trip state";
    case "RISK_STATE_SNAPSHOT_CREATED":
      return "Risk state snapshot created";
    case "RISK_EVENT_PROCESSED":
      return "Marine state update processed";
    default:
      return type;
  }
}

function summaryForTimelineEvent(event: TimelineEventRecord): string {
  switch (event.type) {
    case "TRIP_CREATED":
      return "Active trip recorded in vessel risk memory.";
    case "CONCERN_CARRIED_FORWARD": {
      const concept = event.payload.concept;
      return typeof concept === "string"
        ? `${concept.replaceAll("_", " ")} concern carried forward.`
        : "Operational concern carried forward.";
    }
    case "RISK_STATE_SNAPSHOT_CREATED": {
      const version = event.payload.version;
      return typeof version === "number"
        ? `Immutable risk state version ${version} recorded.`
        : "Immutable risk state snapshot recorded.";
    }
    case "RISK_EVENT_PROCESSED":
      return "Latest marine context compared with recorded trip risk state.";
    default:
      return "Trip timeline event recorded.";
  }
}

export function mapProcessingTraceFromPayload(
  payload: Record<string, unknown>,
): ActiveTripProcessingTraceDto {
  const result = reconstructProcessingResultFromTimelinePayload(payload);
  return {
    deltas: result.deltas,
    reassessmentDecision: result.reassessmentDecision,
    policyDecision: result.policyDecision,
    interpretationStatus: result.interpretationStatus,
    interpretation: result.interpretation,
    previousPosture: result.previousPosture,
    currentPosture: result.currentPosture,
    stateSnapshotCreated: result.stateSnapshotCreated,
    previousStateVersion: result.previousStateVersion,
    newStateVersion: result.newStateVersion,
  };
}

export function mapTimelineEventsToDto(
  events: readonly TimelineEventRecord[],
): ActiveTripTimelineEntry[] {
  return events.map((event) => {
    const entry: ActiveTripTimelineEntry = {
      id: event.id,
      type: event.type,
      occurredAt: event.occurredAt,
      title: titleForTimelineType(event.type),
      summary: summaryForTimelineEvent(event),
    };

    if (event.type === "RISK_EVENT_PROCESSED") {
      entry.processingTrace = mapProcessingTraceFromPayload(event.payload);
    }

    return entry;
  });
}

export function findLatestProcessingTrace(
  events: readonly TimelineEventRecord[],
): ActiveTripProcessingTraceDto | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "RISK_EVENT_PROCESSED") {
      return mapProcessingTraceFromPayload(event.payload);
    }
  }
  return null;
}

export function findLatestProcessingResult(
  events: readonly TimelineEventRecord[],
): RiskEventProcessingResult | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "RISK_EVENT_PROCESSED") {
      return reconstructProcessingResultFromTimelinePayload(event.payload);
    }
  }
  return null;
}
