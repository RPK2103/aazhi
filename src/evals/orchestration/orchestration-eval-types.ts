import type { MarineStateUpdatedEvent } from "@/domain/risk";

export type OrchestrationFixtureId =
  | "S003_SUCCESS"
  | "BELOW_SENSITIVITY"
  | "IDENTICAL_STATE"
  | "PROVIDER_FAILURE"
  | "GROUNDING_FAILURE"
  | "DUPLICATE_REPLAY";

export interface OrchestrationScenarioFixture {
  id: OrchestrationFixtureId;
  description: string;
  event: MarineStateUpdatedEvent;
  duplicateReplay?: boolean;
  providerMode: "valid" | "throw" | "fabricated-grounding" | "unused";
  expectedDuplicate?: boolean;
  expectedSnapshotCreated?: boolean;
  expectedInterpreterInvoked?: boolean;
  expectedInterpretationStatus?: "SKIPPED" | "SUCCEEDED" | "FAILED";
  expectedPolicyAction?:
    | "NO_ACTION_REQUIRED"
    | "REASSESSMENT_REQUIRED"
    | "COORDINATOR_REVIEW_REQUIRED"
    | "OFFICIAL_ALERT_PRIORITY";
  expectedPosture?:
    | "BASELINE"
    | "CAUTION"
    | "REASSESSMENT_REQUIRED"
    | "COORDINATOR_REVIEW_REQUIRED"
    | "OFFICIAL_ALERT_PRIORITY";
  expectedNewVersion?: number;
}

export interface OrchestrationScenarioResult {
  fixtureId: OrchestrationFixtureId;
  success: boolean;
  duplicateEvent: boolean;
  deltaPreserved: boolean;
  reassessmentPreserved: boolean;
  policyPreserved: boolean;
  selectiveInvocationAccurate: boolean;
  postureTransitionAccurate: boolean;
  snapshotCreationAccurate: boolean;
  timelineTraceComplete: boolean;
  interpreterFailurePolicyPreserved?: boolean;
}

export interface OrchestrationEvaluationMetrics {
  eventProcessingSuccessRate: number;
  deltaPreservationRate: number;
  reassessmentPreservationRate: number;
  policyPreservationRate: number;
  selectiveAiInvocationAccuracy: number;
  postureTransitionAccuracy: number;
  snapshotCreationAccuracy: number;
  timelineTraceCompletenessRate: number;
  duplicateEventReprocessingCount: number;
  interpreterFailurePolicyDegradationAccuracy: number;
}

export interface OrchestrationEvaluationResult {
  scenarioCount: number;
  metrics: OrchestrationEvaluationMetrics;
  scenarioResults: OrchestrationScenarioResult[];
}
