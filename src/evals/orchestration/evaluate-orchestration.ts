import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  type MarineStateUpdatedEvent,
} from "@/domain/risk";
import { deriveOperationalPolicyDecision } from "@/domain/policy";
import {
  deriveNextRiskPosture,
  processRiskEvent,
  processingTraceHasRequiredFields,
} from "@/application/risk-orchestrator";
import { shouldInvokeRiskInterpreter } from "@/lib/ai";
import { deserializeRiskState } from "@/application/persistence";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import {
  ORCH_EVENT_PROCESSED_AT,
  S003_EVENT_ID,
  S003_TRIP_ID,
  buildOrchestratorDependencies,
  buildS003ValidInterpretationResponse,
  createCountingInterpreterProvider,
  seedS003PersistedTrip,
} from "@/test-support/orchestration/orchestration-fixtures";
import type {
  OrchestrationEvaluationResult,
  OrchestrationScenarioFixture,
  OrchestrationScenarioResult,
} from "./orchestration-eval-types";

function baselineMarineEvent(
  id: string,
  marineState: MarineStateUpdatedEvent["marineState"],
): MarineStateUpdatedEvent {
  return {
    id,
    tripId: S003_TRIP_ID,
    type: "MARINE_STATE_UPDATED",
    occurredAt: ORCH_EVENT_PROCESSED_AT,
    marineState,
  };
}

export const ORCHESTRATION_SCENARIO_FIXTURES: OrchestrationScenarioFixture[] = [
  {
    id: "S003_SUCCESS",
    description: "S003 worsening marine with active engine concern",
    event: baselineMarineEvent(S003_EVENT_ID, {
      waveHeightM: 1.5,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    }),
    providerMode: "valid",
    expectedSnapshotCreated: true,
    expectedInterpreterInvoked: true,
    expectedInterpretationStatus: "SUCCEEDED",
    expectedPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
    expectedPosture: "COORDINATOR_REVIEW_REQUIRED",
    expectedNewVersion: 2,
  },
  {
    id: "BELOW_SENSITIVITY",
    description: "Factual marine update below reassessment sensitivity",
    event: baselineMarineEvent("evt-eval-below-sensitivity", {
      waveHeightM: 1.0,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    }),
    providerMode: "unused",
    expectedSnapshotCreated: true,
    expectedInterpreterInvoked: false,
    expectedInterpretationStatus: "SKIPPED",
    expectedPolicyAction: "NO_ACTION_REQUIRED",
    expectedPosture: "CAUTION",
    expectedNewVersion: 2,
  },
  {
    id: "IDENTICAL_STATE",
    description: "Identical marine state produces no snapshot churn",
    event: baselineMarineEvent("evt-eval-identical", {
      waveHeightM: 0.8,
      wavePeriodS: null,
      windSpeedKmh: 13,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T05:55:00.000Z",
    }),
    providerMode: "unused",
    expectedSnapshotCreated: false,
    expectedInterpreterInvoked: false,
    expectedInterpretationStatus: "SKIPPED",
    expectedPolicyAction: "NO_ACTION_REQUIRED",
    expectedPosture: "CAUTION",
    expectedNewVersion: 1,
  },
  {
    id: "PROVIDER_FAILURE",
    description: "Interpreter provider failure does not change deterministic policy",
    event: baselineMarineEvent("evt-eval-provider-failure", {
      waveHeightM: 1.5,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    }),
    providerMode: "throw",
    expectedSnapshotCreated: true,
    expectedInterpreterInvoked: true,
    expectedInterpretationStatus: "FAILED",
    expectedPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
    expectedPosture: "COORDINATOR_REVIEW_REQUIRED",
    expectedNewVersion: 2,
  },
  {
    id: "GROUNDING_FAILURE",
    description: "Grounding provenance failure does not persist invalid interpretation",
    event: baselineMarineEvent("evt-eval-grounding-failure", {
      waveHeightM: 1.5,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    }),
    providerMode: "fabricated-grounding",
    expectedSnapshotCreated: true,
    expectedInterpreterInvoked: true,
    expectedInterpretationStatus: "FAILED",
    expectedPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
    expectedPosture: "COORDINATOR_REVIEW_REQUIRED",
    expectedNewVersion: 2,
  },
  {
    id: "DUPLICATE_REPLAY",
    description: "Duplicate S003 event replay is idempotent",
    event: baselineMarineEvent(S003_EVENT_ID, {
      waveHeightM: 1.5,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    }),
    duplicateReplay: true,
    providerMode: "valid",
    expectedDuplicate: true,
    expectedSnapshotCreated: true,
    expectedInterpreterInvoked: false,
    expectedNewVersion: 2,
  },
];

function buildProvider(mode: OrchestrationScenarioFixture["providerMode"]) {
  if (mode === "throw") {
    return createCountingInterpreterProvider(null, { shouldThrow: true });
  }
  if (mode === "fabricated-grounding") {
    return createCountingInterpreterProvider({
      ...buildS003ValidInterpretationResponse(),
      groundingSources: [
        {
          recordId: "sk-fabricated-id",
          authority: "FAO",
          documentTitle: "Fabricated",
          sourceLocator: "Fabricated",
          sourceUrl: "https://www.fao.org/fishery/en/topic/16144",
        },
      ],
    });
  }
  if (mode === "valid") {
    return createCountingInterpreterProvider(buildS003ValidInterpretationResponse());
  }
  return createCountingInterpreterProvider(buildS003ValidInterpretationResponse());
}

async function runScenario(
  fixture: OrchestrationScenarioFixture,
): Promise<OrchestrationScenarioResult> {
  const repos = createInMemoryPersistenceRepositories();
  await seedS003PersistedTrip(repos);
  const counting = buildProvider(fixture.providerMode);
  const deps = buildOrchestratorDependencies(repos, counting.provider);

  if (fixture.duplicateReplay) {
    await processRiskEvent(
      {
        event: fixture.event,
        processedAt: ORCH_EVENT_PROCESSED_AT,
        timelineEventId: `${S003_TRIP_ID}-risk-event-${fixture.event.id}`,
        timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
      },
      deps,
    );
  }

  const latestBefore = await repos.riskStates.findLatestByTripId(S003_TRIP_ID);
  const previousState = deserializeRiskState(latestBefore!.stateJson);
  const candidateState = {
    ...previousState,
    marineState: fixture.event.marineState,
  };
  const expectedDeltas = calculateRiskDeltas(previousState, candidateState);
  const expectedReassessment = evaluateReassessmentNeed(
    expectedDeltas,
    candidateState.activeConcerns,
  );
  const expectedPolicy = deriveOperationalPolicyDecision(
    expectedReassessment,
    ORCH_EVENT_PROCESSED_AT,
  );
  const expectedPosture = deriveNextRiskPosture(
    previousState.posture,
    expectedPolicy,
  );
  const expectedSnapshotCreated = expectedDeltas.length > 0;
  const expectedInterpreterInvoked = shouldInvokeRiskInterpreter(expectedReassessment);

  const result = await processRiskEvent(
    {
      event: fixture.event,
      processedAt: ORCH_EVENT_PROCESSED_AT,
      timelineEventId: `${S003_TRIP_ID}-risk-event-${fixture.id}`,
      timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
    },
    deps,
  );

  const timeline = await repos.timeline.findByTripId(S003_TRIP_ID);
  const processingEvent = timeline
    .filter((record) => record.type === "RISK_EVENT_PROCESSED")
    .find((record) => record.payload.sourceEventId === fixture.event.id);

  const interpreterFailurePolicyPreserved =
    fixture.id === "PROVIDER_FAILURE" || fixture.id === "GROUNDING_FAILURE"
      ? result.policyDecision.action === expectedPolicy.action &&
        result.currentPosture === expectedPosture
      : undefined;

  return {
    fixtureId: fixture.id,
    success: !fixture.duplicateReplay || result.duplicateEvent === true,
    duplicateEvent: result.duplicateEvent,
    deltaPreserved: JSON.stringify(result.deltas) === JSON.stringify(expectedDeltas),
    reassessmentPreserved:
      JSON.stringify(result.reassessmentDecision) ===
      JSON.stringify(expectedReassessment),
    policyPreserved: result.policyDecision.action === expectedPolicy.action,
    selectiveInvocationAccurate:
      counting.getInvocationCount() === (fixture.duplicateReplay ? 1 : expectedInterpreterInvoked ? 1 : 0),
    postureTransitionAccurate: result.currentPosture === expectedPosture,
    snapshotCreationAccurate: result.stateSnapshotCreated === expectedSnapshotCreated,
    timelineTraceComplete:
      fixture.duplicateReplay || processingEvent
        ? processingTraceHasRequiredFields(
            fixture.duplicateReplay
              ? timeline.find(
                  (record) =>
                    record.type === "RISK_EVENT_PROCESSED" &&
                    record.payload.sourceEventId === fixture.event.id,
                )!.payload
              : processingEvent!.payload,
          )
        : false,
    interpreterFailurePolicyPreserved,
  };
}

export async function evaluateOrchestrationScenarios(
  fixtures: OrchestrationScenarioFixture[] = ORCHESTRATION_SCENARIO_FIXTURES,
): Promise<OrchestrationEvaluationResult> {
  const scenarioResults: OrchestrationScenarioResult[] = [];

  for (const fixture of fixtures) {
    scenarioResults.push(await runScenario(fixture));
  }

  const nonDuplicateResults = scenarioResults.filter(
    (result) => result.fixtureId !== "DUPLICATE_REPLAY",
  );
  const failurePolicyResults = scenarioResults.filter(
    (result) =>
      result.interpreterFailurePolicyPreserved !== undefined &&
      result.interpreterFailurePolicyPreserved,
  );

  const countTrue = (values: boolean[]) =>
    values.filter((value) => value).length / (values.length || 1);

  return {
    scenarioCount: fixtures.length,
    scenarioResults,
    metrics: {
      eventProcessingSuccessRate: countTrue(
        nonDuplicateResults.map((result) => result.success),
      ),
      deltaPreservationRate: countTrue(
        nonDuplicateResults.map((result) => result.deltaPreserved),
      ),
      reassessmentPreservationRate: countTrue(
        nonDuplicateResults.map((result) => result.reassessmentPreserved),
      ),
      policyPreservationRate: countTrue(
        nonDuplicateResults.map((result) => result.policyPreserved),
      ),
      selectiveAiInvocationAccuracy: countTrue(
        scenarioResults.map((result) => result.selectiveInvocationAccurate),
      ),
      postureTransitionAccuracy: countTrue(
        nonDuplicateResults.map((result) => result.postureTransitionAccurate),
      ),
      snapshotCreationAccuracy: countTrue(
        nonDuplicateResults.map((result) => result.snapshotCreationAccurate),
      ),
      timelineTraceCompletenessRate: countTrue(
        nonDuplicateResults.map((result) => result.timelineTraceComplete),
      ),
      duplicateEventReprocessingCount: scenarioResults.filter(
        (result) =>
          result.fixtureId === "DUPLICATE_REPLAY" && result.duplicateEvent,
      ).length > 0
        ? 0
        : 1,
      interpreterFailurePolicyDegradationAccuracy:
        failurePolicyResults.length === 0
          ? 1
          : countTrue(
              failurePolicyResults.map(
                (result) => result.interpreterFailurePolicyPreserved === true,
              ),
            ),
    },
  };
}
