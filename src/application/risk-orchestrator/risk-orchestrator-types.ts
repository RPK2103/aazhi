import type {
  ReassessmentEvaluation,
  RiskDelta,
  RiskPosture,
} from "@/domain/risk";
import type { OperationalPolicyDecision } from "@/domain/policy";
import type { RiskEventType } from "@/domain/risk/events";
import type { RiskInterpretation } from "@/lib/ai/risk-interpreter-types";
import type { SafetyKnowledgeRecord } from "@/domain/safety";
import type {
  TimelineEventRepository,
  TripRiskStateRepository,
} from "@/application/persistence/persistence-ports";
import type { RiskInterpreterProvider } from "@/lib/ai/risk-interpreter";

export const INTERPRETATION_STATUSES = ["SKIPPED", "SUCCEEDED", "FAILED"] as const;

export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number];

export const INTERPRETATION_FAILURE_REASONS = [
  "PROVIDER_FAILURE",
  "INVALID_INTERPRETATION_OUTPUT",
  "GROUNDING_PROVENANCE_FAILURE",
  "UNKNOWN_INTERPRETER_FAILURE",
] as const;

export type InterpretationFailureReason =
  (typeof INTERPRETATION_FAILURE_REASONS)[number];

export interface RiskEventProcessingResult {
  eventId: string;
  tripId: string;
  eventType: RiskEventType;
  duplicateEvent: boolean;
  previousStateVersion: number;
  newStateVersion: number;
  stateSnapshotCreated: boolean;
  deltas: readonly RiskDelta[];
  reassessmentDecision: ReassessmentEvaluation;
  policyDecision: OperationalPolicyDecision;
  interpretationStatus: InterpretationStatus;
  interpretation: RiskInterpretation | null;
  interpretationFailureReason: InterpretationFailureReason | null;
  previousPosture: RiskPosture;
  currentPosture: RiskPosture;
  processedAt: string;
}

export interface RiskOrchestratorDependencies {
  tripRiskStates: TripRiskStateRepository;
  timeline: TimelineEventRepository;
  riskInterpreter: RiskInterpreterProvider;
  safetyKnowledge: readonly SafetyKnowledgeRecord[];
}

export class MissingTripRiskStateError extends Error {
  constructor(tripId: string) {
    super(`No persisted trip risk state found for trip: ${tripId}`);
    this.name = "MissingTripRiskStateError";
  }
}

export class MalformedProcessingTimelinePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedProcessingTimelinePayloadError";
  }
}
