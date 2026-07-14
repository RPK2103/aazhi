export const TRIP_ID = "11111111-1111-4111-8111-111111111111";
export const VESSEL_ID = "22222222-2222-4222-8222-222222222222";
export const STALE_TRIP_ID = "33333333-3333-4333-8333-333333333333";

export const marineContext = {
  waveHeight: 0.8,
  wavePeriod: 8,
  windWaveHeight: 0.2,
  swellWaveHeight: 0.5,
  checkedAt: "2026-07-13T07:55:00.000Z",
  source: "Open-Meteo Marine Forecast",
};

export const assessmentResponse = {
  assessment: {
    actionPosture: "PROCEED WITH CAUTION",
    urgency: "MODERATE",
    situationSummary: "Reported nearshore change needs attention before departure.",
    conditionConflict: {
      detected: true,
      explanation: "Reported local conditions add concern beyond the forecast alone.",
    },
    departureBlockers: [
      {
        title: "Engine reliability",
        reason: "The recent engine issue remains unresolved.",
        priority: "HIGH",
      },
    ],
    whyThisMatters: "Mechanical gaps increase trip exposure.",
    immediateActions: ["Inspect and test the engine."],
    preDepartureChecklist: ["Restore backup communication."],
    atSeaActions: ["Monitor conditions continuously."],
    afterReturnActions: ["Record any recurring engine issue."],
    marineContextExplanation: "Marine readings are one input in the assessment.",
    language: "English",
  },
  marineContext,
};

export function buildActiveTripDto(options?: {
  stateVersion?: number;
  currentPosture?: string;
  lastEvaluatedAt?: string;
  waveHeightM?: number;
  windSpeedKmh?: number;
  latestProcessingTrace?: Record<string, unknown> | null;
  latestPolicyAction?: string | null;
  timeline?: Array<Record<string, unknown>>;
}) {
  const stateVersion = options?.stateVersion ?? 1;
  const lastEvaluatedAt = options?.lastEvaluatedAt ?? "2026-07-13T08:00:00.000Z";
  return {
    tripId: TRIP_ID,
    vesselId: VESSEL_ID,
    tripStatus: "ACTIVE",
    crewCount: 5,
    plannedDurationHours: 8,
    startedAt: "2026-07-13T08:00:00.000Z",
    expectedReturnAt: "2026-07-13T16:00:00.000Z",
    marineReferenceLocation: {
      latitude: 13.125,
      longitude: 80.3,
      label: "Chennai / Kasimedu",
    },
    currentPosture: options?.currentPosture ?? "CAUTION",
    stateVersion,
    lastEvaluatedAt,
    currentMarineState: {
      waveHeightM: options?.waveHeightM ?? 0.8,
      wavePeriodS: null,
      windSpeedKmh: options?.windSpeedKmh ?? 13,
      windDirectionDeg: null,
      capturedAt: "2026-07-13T07:55:00.000Z",
    },
    activeConcerns: [
      {
        id: "concern-1",
        vesselId: VESSEL_ID,
        concept: "ENGINE_RELIABILITY",
        summary: "Engine stopped twice yesterday.",
        status: "OPEN",
        reportedAt: "2026-07-13T07:30:00.000Z",
        resolutionReportedAt: null,
        resolvedAt: null,
        dismissedAt: null,
      },
    ],
    timeline:
      options?.timeline ??
      [
        {
          id: "timeline-1",
          type: "TRIP_STARTED",
          occurredAt: "2026-07-13T08:00:00.000Z",
          summary: "Trip started",
        },
      ],
    manualMonitoringNotice:
      "Marine context updates only when you choose CHECK LATEST SEA CONDITIONS.",
    latestProcessingTrace: options?.latestProcessingTrace ?? null,
    latestPolicyAction: options?.latestPolicyAction ?? null,
  };
}

export function buildStartTripResponse() {
  const dto = buildActiveTripDto();
  return {
    vesselId: dto.vesselId,
    tripId: dto.tripId,
    tripStatus: dto.tripStatus,
    currentPosture: dto.currentPosture,
    stateVersion: dto.stateVersion,
    lastEvaluatedAt: dto.lastEvaluatedAt,
    marineReferenceLocation: dto.marineReferenceLocation,
    currentMarineState: dto.currentMarineState,
    activeConcerns: dto.activeConcerns,
    manualMonitoringNotice: dto.manualMonitoringNotice,
  };
}

export function buildNoDeltaRefreshResponse() {
  return {
    activeTrip: buildActiveTripDto({
      stateVersion: 1,
      timeline: [
        {
          id: "timeline-1",
          type: "TRIP_STARTED",
          occurredAt: "2026-07-13T08:00:00.000Z",
          summary: "Trip started",
        },
        {
          id: "timeline-2",
          type: "RISK_EVENT_PROCESSED",
          occurredAt: "2026-07-13T09:00:00.000Z",
          summary: "Manual marine check recorded",
          processingTrace: {
            deltas: [],
            reassessmentDecision: { required: false, reason: "NO_MATERIAL_CHANGE" },
            policyDecision: { action: "NO_ACTION_REQUIRED" },
            interpretationStatus: "SKIPPED",
          },
        },
      ],
      latestProcessingTrace: {
        deltas: [],
        reassessmentDecision: { required: false, reason: "NO_MATERIAL_CHANGE" },
        policyDecision: { action: "NO_ACTION_REQUIRED" },
        interpretationStatus: "SKIPPED",
      },
    }),
    processingResult: {
      deltas: [],
      reassessmentDecision: { required: false, reason: "NO_MATERIAL_CHANGE" },
      policyDecision: { action: "NO_ACTION_REQUIRED" },
      interpretationStatus: "SKIPPED",
    },
  };
}

const MATERIAL_INTERPRETATION = {
  interactionSummary:
    "Worsening marine readings with an active engine concern need coordinator review.",
  significance: "Combined environmental and mechanical exposure increases trip risk.",
  uncertainty: "Local nearshore conditions may differ from the forecast reference point.",
  relevantConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
  groundingSources: [],
};

const MATERIAL_DELTAS = [
  {
    id: "delta-wave",
    type: "VALUE_INCREASED",
    concept: "WAVE_CONDITIONS",
    measurement: "WAVE_HEIGHT_M",
    previousValue: 0.8,
    currentValue: 1.5,
    absoluteChange: 0.7,
    reassessmentRelevant: true,
    detectedAt: "2026-07-13T10:00:00.000Z",
  },
  {
    id: "delta-wind",
    type: "VALUE_INCREASED",
    concept: "WIND_CONDITIONS",
    measurement: "WIND_SPEED_KMH",
    previousValue: 13,
    currentValue: 18,
    absoluteChange: 5,
    reassessmentRelevant: true,
    detectedAt: "2026-07-13T10:00:00.000Z",
  },
];

const MATERIAL_PROCESSING_TRACE = {
  deltas: MATERIAL_DELTAS,
  reassessmentDecision: {
    required: true,
    reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    triggerConcepts: ["ENGINE_RELIABILITY"],
  },
  policyDecision: {
    action: "COORDINATOR_REVIEW_REQUIRED",
    reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
    triggerConcepts: ["ENGINE_RELIABILITY"],
    derivedAt: "2026-07-13T10:00:00.000Z",
  },
  interpretationStatus: "SUCCEEDED",
  interpretation: MATERIAL_INTERPRETATION,
};

export function buildMaterialChangeRefreshResponse() {
  return {
    activeTrip: buildActiveTripDto({
      stateVersion: 2,
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      waveHeightM: 1.5,
      windSpeedKmh: 18,
      latestPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
      latestProcessingTrace: MATERIAL_PROCESSING_TRACE,
    }),
    processingResult: MATERIAL_PROCESSING_TRACE,
  };
}

export function buildInterpreterFailureRefreshResponse() {
  const failureTrace = {
    deltas: [MATERIAL_DELTAS[0]],
    reassessmentDecision: {
      required: true,
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      triggerConcepts: ["ENGINE_RELIABILITY"],
    },
    policyDecision: {
      action: "COORDINATOR_REVIEW_REQUIRED",
      reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      triggerConcepts: ["ENGINE_RELIABILITY"],
      derivedAt: "2026-07-13T10:00:00.000Z",
    },
    interpretationStatus: "FAILED",
    interpretation: null,
  };

  return {
    activeTrip: buildActiveTripDto({
      stateVersion: 2,
      currentPosture: "REASSESSMENT_REQUIRED",
      waveHeightM: 1.5,
      windSpeedKmh: 18,
      latestPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
      latestProcessingTrace: failureTrace,
    }),
    processingResult: failureTrace,
  };
}

const COORDINATOR_NOTICE =
  "AAZHI is not continuously monitoring these trips. Attention reflects recorded trip state and manually processed updates.";

const ENGINE_CONCERN = {
  id: "concern-1",
  vesselId: VESSEL_ID,
  concept: "ENGINE_RELIABILITY",
  summary: "Engine stopped twice yesterday.",
  status: "OPEN",
  reportedAt: "2026-07-13T07:30:00.000Z",
};

const WAVE_DELTA = {
  id: "delta-wave",
  type: "VALUE_INCREASED",
  concept: "WAVE_CONDITIONS",
  measurement: "WAVE_HEIGHT_M",
  previousValue: 0.8,
  currentValue: 1.5,
  absoluteChange: 0.7,
  reassessmentRelevant: true,
  detectedAt: "2026-07-13T10:00:00.000Z",
};

function buildCoordinatorTrip(
  partial: Record<string, unknown> & {
    currentPosture: string;
    attentionGroup: string;
    attentionBasis: Record<string, unknown>;
  },
) {
  return {
    tripId: TRIP_ID,
    vesselId: VESSEL_ID,
    tripStatus: "ACTIVE",
    vesselDisplayName: "TN-04",
    registrationReference: null,
    vesselType: "Small fibre boat",
    marineReferenceLocation: {
      latitude: 13.125,
      longitude: 80.3,
      label: "Chennai / Kasimedu",
    },
    crewCount: 5,
    plannedDurationHours: 8,
    startedAt: "2026-07-13T08:00:00.000Z",
    expectedReturnAt: "2026-07-13T16:00:00.000Z",
    stateVersion: 2,
    riskStateRecordedAt: "2026-07-13T09:00:00.000Z",
    latestProcessingInterpretationStatus: null,
    attentionRelevantTraceOccurredAt: null,
    ...partial,
  };
}

export function buildCoordinatorAttentionResponse() {
  return {
    generatedAt: "2026-07-13T10:00:00.000Z",
    manualMonitoringNotice: COORDINATOR_NOTICE,
    summary: {
      totalActiveTrips: 1,
      attentionRequiredCount: 1,
      watchCount: 0,
      stableCount: 0,
      notCheckedYetCount: 0,
    },
    attentionRequired: [
      buildCoordinatorTrip({
        currentPosture: "REASSESSMENT_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        latestPolicyAction: "NO_ACTION_REQUIRED",
        latestManualCheckAt: "2026-07-13T09:00:00.000Z",
        activeConcerns: [ENGINE_CONCERN],
        attentionBasis: {
          kind: "PERSISTED_STATE",
          currentPosture: "REASSESSMENT_REQUIRED",
          activeConcernConcepts: ["ENGINE_RELIABILITY"],
          materialDeltas: [],
          reassessmentDecision: null,
          policyAction: null,
          interpretationStatus: null,
          interpretation: null,
          occurredAt: "2026-07-13T09:00:00.000Z",
        },
      }),
    ],
    watch: [],
    stable: [],
  };
}

export function buildCoordinatorProcessingTraceResponse() {
  return {
    generatedAt: "2026-07-13T10:00:00.000Z",
    manualMonitoringNotice: COORDINATOR_NOTICE,
    summary: {
      totalActiveTrips: 1,
      attentionRequiredCount: 1,
      watchCount: 0,
      stableCount: 0,
      notCheckedYetCount: 0,
    },
    attentionRequired: [
      buildCoordinatorTrip({
        currentPosture: "COORDINATOR_REVIEW_REQUIRED",
        attentionGroup: "ATTENTION_REQUIRED",
        latestPolicyAction: "COORDINATOR_REVIEW_REQUIRED",
        latestManualCheckAt: "2026-07-13T10:00:00.000Z",
        latestProcessingInterpretationStatus: "SUCCEEDED",
        activeConcerns: [],
        attentionBasis: {
          kind: "PROCESSING_TRACE",
          currentPosture: "COORDINATOR_REVIEW_REQUIRED",
          activeConcernConcepts: [],
          materialDeltas: [WAVE_DELTA],
          reassessmentDecision: {
            required: true,
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["WAVE_CONDITIONS"],
          },
          policyAction: "COORDINATOR_REVIEW_REQUIRED",
          interpretationStatus: "SUCCEEDED",
          interpretation: {
            interactionSummary: "Grounded explanation from latest processing trace.",
            significance: "Recorded processing trace established coordinator attention.",
            uncertainty: "Nearshore variability may differ from forecast reference.",
            relevantConcepts: ["WAVE_CONDITIONS"],
            groundingSources: [],
          },
          occurredAt: "2026-07-13T10:00:00.000Z",
        },
      }),
    ],
    watch: [],
    stable: [],
  };
}
