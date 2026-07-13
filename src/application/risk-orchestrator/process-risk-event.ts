import {
  applyRiskEvent,
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  isActiveConcern,
  type RiskDelta,
  type RiskEvent,
  type RiskState,
} from "@/domain/risk";
import { deriveOperationalPolicyDecision } from "@/domain/policy";
import {
  buildRiskInterpretationInput,
  interpretRiskChange,
  RiskInterpretationError,
  shouldInvokeRiskInterpreter,
  type RiskInterpretation,
  type RiskInterpretationFailureStage,
} from "@/lib/ai";
import { deserializeRiskState, serializeRiskState } from "@/application/persistence";
import type { TimelineEventRecord } from "@/application/persistence/persistence-models";
import { deriveNextRiskPosture } from "./risk-posture-transition";
import {
  buildProcessingTimelinePayload,
  reconstructProcessingResultFromTimelinePayload,
} from "./processing-timeline-payload";
import {
  MissingTripRiskStateError,
  type InterpretationFailureReason,
  type InterpretationStatus,
  type RiskEventProcessingResult,
  type RiskOrchestratorDependencies,
} from "./risk-orchestrator-types";

export interface ProcessRiskEventInput {
  event: RiskEvent;
  processedAt: string;
  timelineEventId: string;
  timelineCreatedAt: string;
  snapshotId?: string;
  snapshotCreatedAt?: string;
}

function mapInterpreterFailure(
  error: RiskInterpretationError,
): InterpretationFailureReason {
  return mapInterpretationFailureStage(error.failureStage);
}

function findDuplicateProcessingEvent(
  timelineEvents: readonly TimelineEventRecord[],
  sourceEventId: string,
): TimelineEventRecord | undefined {
  return timelineEvents.find(
    (record) =>
      record.type === "RISK_EVENT_PROCESSED" &&
      record.payload.sourceEventId === sourceEventId,
  );
}

function copyRiskDelta(delta: RiskDelta): RiskDelta {
  return { ...delta };
}

/**
 * One constrained event-processing loop for active-trip contextual risk.
 */
export async function processRiskEvent(
  input: ProcessRiskEventInput,
  dependencies: RiskOrchestratorDependencies,
): Promise<RiskEventProcessingResult> {
  const { event, processedAt } = input;
  const timelineEvents = await dependencies.timeline.findByTripId(event.tripId);
  const duplicateRecord = findDuplicateProcessingEvent(timelineEvents, event.id);

  if (duplicateRecord) {
    const reconstructed = reconstructProcessingResultFromTimelinePayload(
      duplicateRecord.payload,
    );
    return {
      ...reconstructed,
      eventId: event.id,
      tripId: event.tripId,
      eventType: event.type,
      duplicateEvent: true,
    };
  }

  const latestSnapshot = await dependencies.tripRiskStates.findLatestByTripId(event.tripId);
  if (!latestSnapshot) {
    throw new MissingTripRiskStateError(event.tripId);
  }

  const previousState = deserializeRiskState(latestSnapshot.stateJson);
  const previousPosture = previousState.posture;
  const previousStateVersion = previousState.version;

  const candidateState = applyRiskEvent(previousState, event);
  const deltas = calculateRiskDeltas(previousState, candidateState);
  const activeConcerns = candidateState.activeConcerns.filter(isActiveConcern);
  const reassessmentDecision = evaluateReassessmentNeed(deltas, activeConcerns);
  const policyDecision = deriveOperationalPolicyDecision(
    reassessmentDecision,
    processedAt,
  );

  let interpretationStatus: InterpretationStatus = "SKIPPED";
  let interpretation: RiskInterpretation | null = null;
  let interpretationFailureReason: InterpretationFailureReason | null = null;

  if (shouldInvokeRiskInterpreter(reassessmentDecision)) {
    const interpreterInput = buildRiskInterpretationInput(
      candidateState,
      deltas,
      reassessmentDecision,
      dependencies.safetyKnowledge,
    );

    try {
      interpretation = await interpretRiskChange(
        interpreterInput,
        dependencies.riskInterpreter,
      );
      interpretationStatus = "SUCCEEDED";
    } catch (error) {
      interpretationStatus = "FAILED";
      interpretation = null;
      if (error instanceof RiskInterpretationError) {
        interpretationFailureReason = mapInterpreterFailure(error);
      } else {
        interpretationFailureReason = "UNKNOWN_INTERPRETER_FAILURE";
      }
    }
  }

  const currentPosture = deriveNextRiskPosture(previousPosture, policyDecision);
  const stateSnapshotCreated = deltas.length > 0;
  const newStateVersion = stateSnapshotCreated
    ? previousStateVersion + 1
    : previousStateVersion;

  if (stateSnapshotCreated) {
    const nextState: RiskState = {
      tripContext: { ...candidateState.tripContext },
      marineState: { ...candidateState.marineState },
      activeConcerns: candidateState.activeConcerns.map((concern) => ({ ...concern })),
      posture: currentPosture,
      lastEvaluatedAt: processedAt,
      version: newStateVersion,
    };

    await dependencies.tripRiskStates.create({
      id: input.snapshotId ?? `${event.tripId}-snapshot-${newStateVersion}`,
      tripId: event.tripId,
      version: newStateVersion,
      posture: currentPosture,
      stateJson: serializeRiskState(nextState),
      lastEvaluatedAt: processedAt,
      createdAt: input.snapshotCreatedAt ?? processedAt,
    });
  }

  const result: RiskEventProcessingResult = {
    eventId: event.id,
    tripId: event.tripId,
    eventType: event.type,
    duplicateEvent: false,
    previousStateVersion,
    newStateVersion,
    stateSnapshotCreated,
    deltas: deltas.map(copyRiskDelta),
    reassessmentDecision: {
      required: reassessmentDecision.required,
      reason: reassessmentDecision.reason,
      triggerConcepts: [...reassessmentDecision.triggerConcepts],
    },
    policyDecision: {
      action: policyDecision.action,
      reason: policyDecision.reason,
      triggerConcepts: [...policyDecision.triggerConcepts],
      derivedAt: policyDecision.derivedAt,
    },
    interpretationStatus,
    interpretation,
    interpretationFailureReason,
    previousPosture,
    currentPosture,
    processedAt,
  };

  await dependencies.timeline.append({
    id: input.timelineEventId,
    tripId: event.tripId,
    type: "RISK_EVENT_PROCESSED",
    payload: buildProcessingTimelinePayload(result),
    occurredAt: processedAt,
    createdAt: input.timelineCreatedAt,
  });

  return result;
}

export function mapInterpretationFailureStage(
  stage: RiskInterpretationFailureStage,
): InterpretationFailureReason {
  switch (stage) {
    case "INTERPRETER_PROVIDER":
      return "PROVIDER_FAILURE";
    case "INTERPRETER_PARSE":
    case "INTERPRETER_ZOD_VALIDATION":
      return "INVALID_INTERPRETATION_OUTPUT";
    case "INTERPRETER_GROUNDING_VALIDATION":
      return "GROUNDING_PROVENANCE_FAILURE";
    case "UNKNOWN":
      return "UNKNOWN_INTERPRETER_FAILURE";
    default:
      return "UNKNOWN_INTERPRETER_FAILURE";
  }
}
