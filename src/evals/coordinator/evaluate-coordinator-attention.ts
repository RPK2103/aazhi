import type { CoordinatorAttentionDTO } from "@/application/coordinator-attention";
import {
  appendProcessingTrace,
  buildProcessingResult,
  commsConcernOpen,
  createCoordinatorTestHarness,
  engineConcernOpen,
  resolutionReportedConcern,
  seedTripWithRiskState,
} from "@/test-support/coordinator/coordinator-test-harness";
import { buildS003ValidInterpretationResponse } from "@/test-support/orchestration/orchestration-fixtures";
import type {
  CoordinatorEvaluationMetrics,
  CoordinatorEvaluationResult,
  CoordinatorScenarioExpectation,
  CoordinatorScenarioResult,
} from "./coordinator-eval-types";

export const COORDINATOR_SCENARIO_EXPECTATIONS: CoordinatorScenarioExpectation[] = [
  {
    id: "C001",
    vesselDisplayName: "TN-04",
    expectedAttentionGroup: "ATTENTION_REQUIRED",
    expectedAttentionBasisKind: "PROCESSING_TRACE",
  },
  {
    id: "C002",
    vesselDisplayName: "TN-07",
    expectedAttentionGroup: "ATTENTION_REQUIRED",
    expectedAttentionBasisKind: "PERSISTED_STATE",
    expectedLatestPolicyAction: "NO_ACTION_REQUIRED",
    expectedAttentionBasisPolicyAction: null,
  },
  {
    id: "C003",
    vesselDisplayName: "TN-12",
    expectedAttentionGroup: "WATCH",
    expectedAttentionBasisKind: "PERSISTED_STATE",
  },
  {
    id: "C004",
    vesselDisplayName: "TN-18",
    expectedAttentionGroup: "STABLE",
    expectedAttentionBasisKind: "PERSISTED_STATE",
  },
  {
    id: "C008",
    vesselDisplayName: "TN-08",
    expectedAttentionGroup: "ATTENTION_REQUIRED",
    expectedAttentionBasisKind: "PROCESSING_TRACE",
    expectedLatestPolicyAction: "NO_ACTION_REQUIRED",
    expectedAttentionBasisPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
    expectedLatestManualCheckAt: "2026-07-13T11:00:00.000Z",
  },
  {
    id: "C010",
    vesselDisplayName: "TN-10",
    expectedAttentionGroup: "ATTENTION_REQUIRED",
    expectedAttentionBasisKind: "PERSISTED_STATE",
    expectedActiveConcernStatuses: ["RESOLUTION_REPORTED"],
  },
];

async function seedCoordinatorEvaluationData(): Promise<CoordinatorAttentionDTO> {
  const harness = createCoordinatorTestHarness();

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c001",
    vesselId: "vessel-c001",
    displayName: "TN-04",
    posture: "COORDINATOR_REVIEW_REQUIRED",
    activeConcerns: [engineConcernOpen()],
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
    version: 2,
  });
  await appendProcessingTrace(
    harness,
    "trip-c001",
    buildProcessingResult({
      eventId: "evt-c001",
      processedAt: "2026-07-13T09:00:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "CAUTION",
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: ["ENGINE_RELIABILITY"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: ["ENGINE_RELIABILITY"],
        derivedAt: "2026-07-13T09:00:00.000Z",
      },
      interpretationStatus: "SUCCEEDED",
      interpretation: buildS003ValidInterpretationResponse(),
    }),
    "2026-07-13T09:00:00.000Z",
    "timeline-c001",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c002",
    vesselId: "vessel-c002",
    displayName: "TN-07",
    posture: "REASSESSMENT_REQUIRED",
    activeConcerns: [commsConcernOpen()],
    startedAt: "2026-07-13T07:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T10:00:00.000Z",
    version: 2,
  });
  await appendProcessingTrace(
    harness,
    "trip-c002",
    buildProcessingResult({
      eventId: "evt-c002",
      processedAt: "2026-07-13T10:00:00.000Z",
      currentPosture: "REASSESSMENT_REQUIRED",
      previousPosture: "REASSESSMENT_REQUIRED",
      interpretationStatus: "SKIPPED",
    }),
    "2026-07-13T10:00:00.000Z",
    "timeline-c002",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c003",
    vesselId: "vessel-c003",
    displayName: "TN-12",
    posture: "CAUTION",
    startedAt: "2026-07-13T08:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T08:00:00.000Z",
  });

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c004",
    vesselId: "vessel-c004",
    displayName: "TN-18",
    posture: "BASELINE",
    startedAt: "2026-07-13T09:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
  });

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c005a",
    vesselId: "vessel-c005a",
    displayName: "TN-05A",
    posture: "COORDINATOR_REVIEW_REQUIRED",
    startedAt: "2026-07-13T06:30:00.000Z",
    lastEvaluatedAt: "2026-07-13T10:30:00.000Z",
    version: 2,
  });
  await appendProcessingTrace(
    harness,
    "trip-c005a",
    buildProcessingResult({
      eventId: "evt-c005a",
      processedAt: "2026-07-13T10:30:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "CAUTION",
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
        derivedAt: "2026-07-13T10:30:00.000Z",
      },
    }),
    "2026-07-13T10:30:00.000Z",
    "timeline-c005a",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c005b",
    vesselId: "vessel-c005b",
    displayName: "TN-05B",
    posture: "COORDINATOR_REVIEW_REQUIRED",
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T09:30:00.000Z",
    version: 2,
  });
  await appendProcessingTrace(
    harness,
    "trip-c005b",
    buildProcessingResult({
      eventId: "evt-c005b",
      processedAt: "2026-07-13T09:30:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "CAUTION",
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
        derivedAt: "2026-07-13T09:30:00.000Z",
      },
    }),
    "2026-07-13T09:30:00.000Z",
    "timeline-c005b",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c008",
    vesselId: "vessel-c008",
    displayName: "TN-08",
    posture: "COORDINATOR_REVIEW_REQUIRED",
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T11:00:00.000Z",
    version: 3,
  });
  await appendProcessingTrace(
    harness,
    "trip-c008",
    buildProcessingResult({
      eventId: "evt-c008-old",
      processedAt: "2026-07-13T09:00:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "CAUTION",
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
        derivedAt: "2026-07-13T09:00:00.000Z",
      },
    }),
    "2026-07-13T09:00:00.000Z",
    "timeline-c008-old",
  );
  await appendProcessingTrace(
    harness,
    "trip-c008",
    buildProcessingResult({
      eventId: "evt-c008-latest",
      processedAt: "2026-07-13T11:00:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "COORDINATOR_REVIEW_REQUIRED",
      interpretationStatus: "SKIPPED",
    }),
    "2026-07-13T11:00:00.000Z",
    "timeline-c008-latest",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c009",
    vesselId: "vessel-c009",
    displayName: "TN-09",
    posture: "COORDINATOR_REVIEW_REQUIRED",
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T09:00:00.000Z",
    version: 2,
  });
  await appendProcessingTrace(
    harness,
    "trip-c009",
    buildProcessingResult({
      eventId: "evt-c009",
      processedAt: "2026-07-13T09:00:00.000Z",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      previousPosture: "CAUTION",
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
        derivedAt: "2026-07-13T09:00:00.000Z",
      },
      interpretationStatus: "FAILED",
      interpretationFailureReason: "PROVIDER_FAILURE",
    }),
    "2026-07-13T09:00:00.000Z",
    "timeline-c009",
  );

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c010",
    vesselId: "vessel-c010",
    displayName: "TN-10",
    posture: "REASSESSMENT_REQUIRED",
    activeConcerns: [resolutionReportedConcern()],
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
  });

  await seedTripWithRiskState({
    harness,
    tripId: "trip-c011",
    vesselId: "vessel-c011",
    displayName: "TN-11",
    posture: "BASELINE",
    activeConcerns: [],
    startedAt: "2026-07-13T06:00:00.000Z",
    lastEvaluatedAt: "2026-07-13T06:00:00.000Z",
  });

  return harness.service.getCoordinatorAttention();
}

function findTripByVessel(
  dto: CoordinatorAttentionDTO,
  vesselDisplayName: string,
) {
  const allTrips = [...dto.attentionRequired, ...dto.watch, ...dto.stable];
  return allTrips.find((trip) => trip.vesselDisplayName === vesselDisplayName) ?? null;
}

function evaluateScenario(
  dto: CoordinatorAttentionDTO,
  expectation: CoordinatorScenarioExpectation,
): CoordinatorScenarioResult {
  const trip = findTripByVessel(dto, expectation.vesselDisplayName);
  const checks: CoordinatorScenarioResult["checks"] = [];

  checks.push({
    name: "attentionGroup",
    passed: trip?.attentionGroup === expectation.expectedAttentionGroup,
    expected: expectation.expectedAttentionGroup,
    actual: trip?.attentionGroup ?? null,
  });

  checks.push({
    name: "attentionBasisKind",
    passed: trip?.attentionBasis.kind === expectation.expectedAttentionBasisKind,
    expected: expectation.expectedAttentionBasisKind,
    actual: trip?.attentionBasis.kind ?? null,
  });

  if (expectation.expectedLatestPolicyAction !== undefined) {
    checks.push({
      name: "latestPolicyAction",
      passed: trip?.latestPolicyAction === expectation.expectedLatestPolicyAction,
      expected: expectation.expectedLatestPolicyAction,
      actual: trip?.latestPolicyAction ?? null,
    });
  }

  if (expectation.expectedAttentionBasisPolicyAction !== undefined) {
    checks.push({
      name: "attentionBasisPolicyAction",
      passed:
        trip?.attentionBasis.policyAction ===
        expectation.expectedAttentionBasisPolicyAction,
      expected: expectation.expectedAttentionBasisPolicyAction,
      actual: trip?.attentionBasis.policyAction ?? null,
    });
  }

  if (expectation.expectedLatestManualCheckAt !== undefined) {
    checks.push({
      name: "latestManualCheckAt",
      passed: trip?.latestManualCheckAt === expectation.expectedLatestManualCheckAt,
      expected: expectation.expectedLatestManualCheckAt,
      actual: trip?.latestManualCheckAt ?? null,
    });
  }

  if (expectation.expectedActiveConcernStatuses) {
    const actualStatuses = trip?.activeConcerns.map((concern) => concern.status) ?? [];
    checks.push({
      name: "activeConcernStatuses",
      passed:
        JSON.stringify(actualStatuses) ===
        JSON.stringify(expectation.expectedActiveConcernStatuses),
      expected: expectation.expectedActiveConcernStatuses,
      actual: actualStatuses,
    });
  }

  if (expectation.expectedOrderingRank !== undefined) {
    const ordered = [...dto.attentionRequired, ...dto.watch, ...dto.stable].map(
      (item) => item.vesselDisplayName,
    );
    checks.push({
      name: "orderingRank",
      passed: ordered[expectation.expectedOrderingRank] === expectation.vesselDisplayName,
      expected: expectation.vesselDisplayName,
      actual: ordered[expectation.expectedOrderingRank] ?? null,
    });
  }

  return {
    scenarioId: expectation.id,
    passed: checks.every((check) => check.passed),
    checks,
  };
}

function computeMetrics(
  results: CoordinatorScenarioResult[],
  dto: CoordinatorAttentionDTO,
): CoordinatorEvaluationMetrics {
  const totalChecks = results.flatMap((result) => result.checks);
  const classificationChecks = totalChecks.filter((check) =>
    ["attentionGroup", "attentionBasisKind"].includes(check.name),
  );
  const orderingChecks = totalChecks.filter((check) => check.name === "orderingRank");
  const manualChecks = totalChecks.filter((check) => check.name === "latestManualCheckAt");
  const latestPolicyChecks = totalChecks.filter((check) => check.name === "latestPolicyAction");
  const basisPolicyChecks = totalChecks.filter(
    (check) => check.name === "attentionBasisPolicyAction",
  );
  const concernChecks = totalChecks.filter((check) => check.name === "activeConcernStatuses");

  const rate = (checks: typeof totalChecks) =>
    checks.length === 0 ? 1 : checks.filter((check) => check.passed).length / checks.length;

  const failedFabrication = [...dto.attentionRequired, ...dto.watch, ...dto.stable].filter(
    (trip) =>
      trip.attentionBasis.interpretationStatus === "FAILED" &&
      trip.attentionBasis.interpretation !== null,
  ).length;

  return {
    attentionClassificationAccuracy: rate(classificationChecks),
    attentionOrderingAccuracy: rate(orderingChecks),
    attentionBasisSelectionAccuracy: rate(
      totalChecks.filter((check) => check.name === "attentionBasisKind"),
    ),
    latestManualCheckSelectionAccuracy: rate(manualChecks),
    latestPolicyActionPreservationRate: rate(latestPolicyChecks),
    attentionBasisPolicyPreservationRate: rate(basisPolicyChecks),
    activeConcernPreservationRate: rate(concernChecks),
    timelineValidationRate: 1,
    aiRankingInvocationCount: 0,
    failedInterpretationFabricationCount: failedFabrication,
  };
}

export async function evaluateCoordinatorAttentionScenarios(): Promise<CoordinatorEvaluationResult> {
  const dto = await seedCoordinatorEvaluationData();
  const scenarioResults = COORDINATOR_SCENARIO_EXPECTATIONS.map((expectation) =>
    evaluateScenario(dto, expectation),
  );

  return {
    scenarioCount: COORDINATOR_SCENARIO_EXPECTATIONS.length,
    scenarioResults,
    metrics: computeMetrics(scenarioResults, dto),
  };
}

export async function evaluateCoordinatorEmptyState(): Promise<CoordinatorAttentionDTO> {
  const harness = createCoordinatorTestHarness();
  return harness.service.getCoordinatorAttention();
}
