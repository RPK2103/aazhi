import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  type MarineStateUpdatedEvent,
} from "@/domain/risk";
import { deriveOperationalPolicyDecision } from "@/domain/policy";
import {
  buildRiskInterpretationInput,
  shouldInvokeRiskInterpreter,
} from "@/lib/ai";
import {
  MalformedProcessingTimelinePayloadError,
  MissingTripRiskStateError,
  deriveNextRiskPosture,
  mapInterpretationFailureStage,
  processRiskEvent,
  processingTraceHasRequiredFields,
  reconstructProcessingResultFromTimelinePayload,
} from "@/application/risk-orchestrator";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";
import {
  ORCH_DAY2_MARINE_CAPTURED_AT,
  ORCH_EVENT_PROCESSED_AT,
  S003_EVENT_ID,
  S003_TRIP_ID,
  buildOrchestratorDependencies,
  buildS003ValidInterpretationResponse,
  createCountingInterpreterProvider,
  seedS003PersistedTrip,
} from "@/test-support/orchestration/orchestration-fixtures";

function s003MarineEvent(
  partial?: Partial<MarineStateUpdatedEvent>,
): MarineStateUpdatedEvent {
  return {
    id: S003_EVENT_ID,
    tripId: S003_TRIP_ID,
    type: "MARINE_STATE_UPDATED",
    occurredAt: ORCH_EVENT_PROCESSED_AT,
    marineState: {
      waveHeightM: 1.5,
      wavePeriodS: null,
      windSpeedKmh: 18,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T06:55:00.000Z",
    },
    ...partial,
  };
}

describe("processRiskEvent", () => {
  it("fails closed when no persisted trip risk state exists", async () => {
    const repos = createInMemoryPersistenceRepositories();
    const { provider } = createCountingInterpreterProvider(
      buildS003ValidInterpretationResponse(),
    );

    await expect(
      processRiskEvent(
        {
          event: s003MarineEvent({ tripId: "missing-trip" }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: "timeline-missing",
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, provider),
      ),
    ).rejects.toBeInstanceOf(MissingTripRiskStateError);
  });

  it("uses the latest persisted trip risk state", async () => {
    const { repos } = await seedS003PersistedTrip();
    const counting = createCountingInterpreterProvider(
      buildS003ValidInterpretationResponse(),
    );

    const result = await processRiskEvent(
      {
        event: s003MarineEvent(),
        processedAt: ORCH_EVENT_PROCESSED_AT,
        timelineEventId: `${S003_TRIP_ID}-risk-event-${S003_EVENT_ID}`,
        timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
      },
      buildOrchestratorDependencies(repos, counting.provider),
    );

    expect(result.previousStateVersion).toBe(1);
  });

  describe("S003 complete flow", () => {
    it("processes marine update with deterministic deltas, policy, interpretation, snapshot, and timeline", async () => {
      const { repos, service } = await seedS003PersistedTrip();
      const counting = createCountingInterpreterProvider(
        buildS003ValidInterpretationResponse(),
      );

      const result = await processRiskEvent(
        {
          event: s003MarineEvent(),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-${S003_EVENT_ID}`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
          snapshotId: `${S003_TRIP_ID}-snapshot-2`,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      const previous = await service.loadTripRiskStateByVersion(S003_TRIP_ID, 1);
      const latest = await service.loadLatestTripRiskState(S003_TRIP_ID);
      const timeline = await repos.timeline.findByTripId(S003_TRIP_ID);
      const processingEvents = timeline.filter(
        (record) => record.type === "RISK_EVENT_PROCESSED",
      );

      const waveDelta = result.deltas.find(
        (delta) => delta.measurement === "WAVE_HEIGHT_M",
      );
      const windDelta = result.deltas.find(
        (delta) => delta.measurement === "WIND_SPEED_KMH",
      );

      expect(result.duplicateEvent).toBe(false);
      expect(waveDelta?.absoluteChange).toBe(0.7);
      expect(windDelta?.absoluteChange).toBe(5);
      expect(waveDelta?.reassessmentRelevant).toBe(true);
      expect(windDelta?.reassessmentRelevant).toBe(false);
      expect(result.reassessmentDecision.required).toBe(true);
      expect(result.reassessmentDecision.reason).toBe(
        "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      );
      expect(result.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(result.interpretationStatus).toBe("SUCCEEDED");
      expect(result.interpretation).not.toBeNull();
      expect(result.previousPosture).toBe("CAUTION");
      expect(result.currentPosture).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(result.stateSnapshotCreated).toBe(true);
      expect(result.newStateVersion).toBe(2);
      expect(counting.getInvocationCount()).toBe(1);

      expect(previous?.riskState.marineState.waveHeightM).toBe(0.8);
      expect(previous?.riskState.posture).toBe("CAUTION");
      expect(latest?.riskState.version).toBe(2);
      expect(latest?.riskState.marineState.waveHeightM).toBe(1.5);
      expect(latest?.riskState.marineState.windSpeedKmh).toBe(18);
      expect(latest?.riskState.posture).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(
        latest?.riskState.activeConcerns.some(
          (concern) =>
            concern.concept === "ENGINE_RELIABILITY" && concern.status === "OPEN",
        ),
      ).toBe(true);

      expect(processingEvents).toHaveLength(1);
      expect(processingEvents[0]?.payload.sourceEventId).toBe(S003_EVENT_ID);
      expect(processingTraceHasRequiredFields(processingEvents[0]!.payload)).toBe(
        true,
      );
    });
  });

  describe("duplicate S003 event", () => {
    it("detects duplicate without reprocessing lifecycle", async () => {
      const { repos } = await seedS003PersistedTrip();
      const counting = createCountingInterpreterProvider(
        buildS003ValidInterpretationResponse(),
      );
      const deps = buildOrchestratorDependencies(repos, counting.provider);

      await processRiskEvent(
        {
          event: s003MarineEvent(),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-${S003_EVENT_ID}`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        deps,
      );

      const duplicate = await processRiskEvent(
        {
          event: s003MarineEvent(),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-${S003_EVENT_ID}-dup`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        deps,
      );

      const timeline = await repos.timeline.findByTripId(S003_TRIP_ID);
      const processingEvents = timeline.filter(
        (record) => record.type === "RISK_EVENT_PROCESSED",
      );
      const latest = await repos.riskStates.findLatestByTripId(S003_TRIP_ID);

      expect(duplicate.duplicateEvent).toBe(true);
      expect(counting.getInvocationCount()).toBe(1);
      expect(latest?.version).toBe(2);
      expect(processingEvents).toHaveLength(1);
    });
  });

  describe("below-sensitivity state change", () => {
    it("persists factual state, skips AI, and preserves posture", async () => {
      const { repos } = await seedS003PersistedTrip();
      const counting = createCountingInterpreterProvider(
        buildS003ValidInterpretationResponse(),
      );

      const result = await processRiskEvent(
        {
          event: s003MarineEvent({
            id: "evt-below-sensitivity-001",
            marineState: {
              waveHeightM: 1.0,
              wavePeriodS: null,
              windSpeedKmh: 18,
              windDirectionDeg: null,
              capturedAt: "2026-07-13T06:55:00.000Z",
            },
          }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-below-sensitivity`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      expect(result.deltas.length).toBeGreaterThan(0);
      expect(result.reassessmentDecision.required).toBe(false);
      expect(result.reassessmentDecision.reason).toBe("NO_MATERIAL_CHANGE");
      expect(result.policyDecision.action).toBe("NO_ACTION_REQUIRED");
      expect(result.interpretationStatus).toBe("SKIPPED");
      expect(counting.getInvocationCount()).toBe(0);
      expect(result.stateSnapshotCreated).toBe(true);
      expect(result.currentPosture).toBe("CAUTION");
    });
  });

  describe("identical marine state event", () => {
    it("creates no snapshot, skips AI, and records one trace", async () => {
      const { repos } = await seedS003PersistedTrip();
      const counting = createCountingInterpreterProvider(
        buildS003ValidInterpretationResponse(),
      );

      const result = await processRiskEvent(
        {
          event: s003MarineEvent({
            id: "evt-identical-001",
            marineState: {
              waveHeightM: 0.8,
              wavePeriodS: null,
              windSpeedKmh: 13,
              windDirectionDeg: null,
              capturedAt: ORCH_DAY2_MARINE_CAPTURED_AT,
            },
          }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-identical`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      const timeline = await repos.timeline.findByTripId(S003_TRIP_ID);

      expect(result.deltas).toEqual([]);
      expect(result.reassessmentDecision.required).toBe(false);
      expect(result.policyDecision.action).toBe("NO_ACTION_REQUIRED");
      expect(result.interpretationStatus).toBe("SKIPPED");
      expect(result.stateSnapshotCreated).toBe(false);
      expect(result.newStateVersion).toBe(1);
      expect(counting.getInvocationCount()).toBe(0);
      expect(
        timeline.filter((record) => record.type === "RISK_EVENT_PROCESSED"),
      ).toHaveLength(1);
    });
  });

  describe("provider failure", () => {
    it("preserves deterministic policy and posture without fabricating explanation", async () => {
      const { repos } = await seedS003PersistedTrip();
      const counting = createCountingInterpreterProvider(null, {
        shouldThrow: true,
      });

      const result = await processRiskEvent(
        {
          event: s003MarineEvent({ id: "evt-provider-failure-001" }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-provider-failure`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      expect(result.deltas.length).toBe(2);
      expect(result.reassessmentDecision.required).toBe(true);
      expect(result.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(result.interpretationStatus).toBe("FAILED");
      expect(result.interpretation).toBeNull();
      expect(result.interpretationFailureReason).toBe("PROVIDER_FAILURE");
      expect(result.currentPosture).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(result.stateSnapshotCreated).toBe(true);
    });
  });

  describe("grounding provenance failure", () => {
    it("does not persist invalid interpretation", async () => {
      const { repos } = await seedS003PersistedTrip();
      const fabricatedResponse = {
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
      };
      const counting = createCountingInterpreterProvider(fabricatedResponse);

      const result = await processRiskEvent(
        {
          event: s003MarineEvent({ id: "evt-grounding-failure-001" }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-grounding-failure`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      expect(result.interpretationStatus).toBe("FAILED");
      expect(result.interpretation).toBeNull();
      expect(result.interpretationFailureReason).toBe(
        "GROUNDING_PROVENANCE_FAILURE",
      );
      expect(result.policyDecision.action).toBe("COORDINATOR_REVIEW_REQUIRED");
      expect(result.currentPosture).toBe("COORDINATOR_REVIEW_REQUIRED");
    });
  });

  describe("deterministic preservation", () => {
    it("preserves exact delta, reassessment, and policy semantics", async () => {
      const { repos } = await seedS003PersistedTrip();
      const previous = await repos.riskStates.findLatestByTripId(S003_TRIP_ID);
      const previousState = JSON.parse(JSON.stringify(previous?.stateJson));
      const candidateMarine = s003MarineEvent().marineState;
      const candidateState = {
        ...previousState,
        marineState: candidateMarine,
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

      const counting = createCountingInterpreterProvider(
        buildS003ValidInterpretationResponse(),
      );
      const result = await processRiskEvent(
        {
          event: s003MarineEvent({ id: "evt-preservation-001" }),
          processedAt: ORCH_EVENT_PROCESSED_AT,
          timelineEventId: `${S003_TRIP_ID}-risk-event-preservation`,
          timelineCreatedAt: ORCH_EVENT_PROCESSED_AT,
        },
        buildOrchestratorDependencies(repos, counting.provider),
      );

      expect(result.deltas).toEqual(expectedDeltas);
      expect(result.reassessmentDecision).toEqual(expectedReassessment);
      expect(result.policyDecision.action).toBe(expectedPolicy.action);
      expect(result.currentPosture).toBe(
        deriveNextRiskPosture("CAUTION", expectedPolicy),
      );
      expect(shouldInvokeRiskInterpreter(expectedReassessment)).toBe(true);
      expect(counting.getInvocationCount()).toBe(1);
    });

    it("builds interpreter input with curated safety context when required", async () => {
      const { repos } = await seedS003PersistedTrip();
      const latest = await repos.riskStates.findLatestByTripId(S003_TRIP_ID);
      const previousState = latest!.stateJson as Parameters<
        typeof calculateRiskDeltas
      >[0];
      const event = s003MarineEvent();
      const candidateState = {
        ...previousState,
        marineState: event.marineState,
      };
      const deltas = calculateRiskDeltas(previousState, candidateState);
      const reassessment = evaluateReassessmentNeed(
        deltas,
        candidateState.activeConcerns,
      );
      const input = buildRiskInterpretationInput(
        candidateState,
        deltas,
        reassessment,
        INITIAL_SAFETY_KNOWLEDGE,
      );

      expect(input.safetyContext.length).toBeGreaterThan(0);
    });
  });

  describe("timeline payload validation", () => {
    it("fails closed on malformed persisted processing payload", () => {
      expect(() =>
        reconstructProcessingResultFromTimelinePayload({
          sourceEventId: S003_EVENT_ID,
          sourceEventType: "MARINE_STATE_UPDATED",
        }),
      ).toThrow(MalformedProcessingTimelinePayloadError);
    });
  });
});

describe("mapInterpretationFailureStage", () => {
  it("maps bounded interpreter failure stages to orchestration failure reasons", () => {
    expect(mapInterpretationFailureStage("INTERPRETER_PROVIDER")).toBe(
      "PROVIDER_FAILURE",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_PARSE")).toBe(
      "INVALID_INTERPRETATION_OUTPUT",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_ZOD_VALIDATION")).toBe(
      "INVALID_INTERPRETATION_OUTPUT",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_GROUNDING_VALIDATION")).toBe(
      "GROUNDING_PROVENANCE_FAILURE",
    );
    expect(mapInterpretationFailureStage("UNKNOWN")).toBe(
      "UNKNOWN_INTERPRETER_FAILURE",
    );
  });
});

describe("mapInterpretationFailureStage", () => {
  it("maps bounded interpreter failure stages to orchestration failure reasons", () => {
    expect(mapInterpretationFailureStage("INTERPRETER_PROVIDER")).toBe(
      "PROVIDER_FAILURE",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_PARSE")).toBe(
      "INVALID_INTERPRETATION_OUTPUT",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_ZOD_VALIDATION")).toBe(
      "INVALID_INTERPRETATION_OUTPUT",
    );
    expect(mapInterpretationFailureStage("INTERPRETER_GROUNDING_VALIDATION")).toBe(
      "GROUNDING_PROVENANCE_FAILURE",
    );
    expect(mapInterpretationFailureStage("UNKNOWN")).toBe(
      "UNKNOWN_INTERPRETER_FAILURE",
    );
  });
});
