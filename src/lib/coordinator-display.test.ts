import { describe, expect, it } from "vitest";
import {
  ATTENTION_REQUIRED_SECTION_COPY,
  COORDINATOR_VIEW_SUBHEADING,
  EMPTY_ACTIVE_TRIPS_COPY,
  EMPTY_ATTENTION_REQUIRED_COPY,
  EMPTY_ATTENTION_REQUIRED_SUPPORT,
  PERSISTED_STATE_ATTENTION_COPY,
  STABLE_SECTION_COPY,
  WATCH_SECTION_COPY,
  formatCoordinatorManualCheck,
  formatConcernStatusLabel,
  formatMaterialDeltasForDisplay,
  getAttentionBasisActionStateLabel,
  getAttentionBasisExplanation,
  getAttentionBasisInterpretationPresentation,
  getLatestActionStateLabel,
  getVesselIdentityLabel,
} from "@/lib/coordinator-display";
import { COORDINATOR_MANUAL_MONITORING_NOTICE } from "@/application/coordinator-attention";

describe("coordinator display helpers", () => {
  it("uses accurate attention section copy", () => {
    expect(ATTENTION_REQUIRED_SECTION_COPY).toContain("recorded posture");
    expect(WATCH_SECTION_COPY).not.toMatch(/unsafe|dangerous|high risk/i);
    expect(STABLE_SECTION_COPY).not.toMatch(/safe|cleared|seaworthy/i);
  });

  it("shows coordinator subheading and manual monitoring notice", () => {
    expect(COORDINATOR_VIEW_SUBHEADING).toContain("recorded risk state");
    expect(COORDINATOR_MANUAL_MONITORING_NOTICE).toContain(
      "not continuously monitoring",
    );
  });

  it("formats RESOLUTION REPORTED concern status", () => {
    expect(formatConcernStatusLabel("RESOLUTION_REPORTED")).toBe(
      "RESOLUTION REPORTED",
    );
  });

  it("uses persisted-state attention copy without implying clearance", () => {
    const explanation = getAttentionBasisExplanation({
      kind: "PERSISTED_STATE",
      currentPosture: "REASSESSMENT_REQUIRED",
      activeConcernConcepts: ["PRIMARY_COMMUNICATION"],
      materialDeltas: [],
      reassessmentDecision: null,
      policyAction: null,
      interpretationStatus: null,
      interpretation: null,
      occurredAt: "2026-07-13T06:00:00.000Z",
    });
    expect(explanation).toBe(PERSISTED_STATE_ATTENTION_COPY);
    expect(getLatestActionStateLabel("NO_ACTION_REQUIRED")).toBe(
      "NO NEW AAZHI ACTION",
    );
  });

  it("does not fabricate skipped or failed interpretation explanations", () => {
    const skipped = getAttentionBasisInterpretationPresentation({
      kind: "PROCESSING_TRACE",
      currentPosture: "REASSESSMENT_REQUIRED",
      activeConcernConcepts: [],
      materialDeltas: [],
      reassessmentDecision: {
        required: false,
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
      },
      policyAction: "NO_ACTION_REQUIRED",
      interpretationStatus: "SKIPPED",
      interpretation: null,
      occurredAt: "2026-07-13T10:00:00.000Z",
    });
    expect(skipped.body).toContain("No contextual interpretation was generated");

    const failed = getAttentionBasisInterpretationPresentation({
      kind: "PROCESSING_TRACE",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      activeConcernConcepts: [],
      materialDeltas: [],
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      policyAction: "COORDINATOR_REVIEW_REQUIRED",
      interpretationStatus: "FAILED",
      interpretation: null,
      occurredAt: "2026-07-13T10:00:00.000Z",
    });
    expect(failed.body).toContain("could not generate a grounded contextual explanation");
  });

  it("shows NOT CHECKED YET when latest manual check is null", () => {
    expect(formatCoordinatorManualCheck(null)).toBe("NOT CHECKED YET");
  });

  it("uses accurate empty states without claiming fleet safety", () => {
    expect(EMPTY_ATTENTION_REQUIRED_COPY).not.toMatch(/safe|danger/i);
    expect(EMPTY_ATTENTION_REQUIRED_SUPPORT).toContain("recorded risk states");
    expect(EMPTY_ACTIVE_TRIPS_COPY).toContain("NO ACTIVE TRIPS RECORDED");
  });

  it("formats material deltas with signed change for processing trace basis", () => {
    const deltas = formatMaterialDeltasForDisplay({
      kind: "PROCESSING_TRACE",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      activeConcernConcepts: ["ENGINE_RELIABILITY"],
      materialDeltas: [
        {
          id: "delta-wave",
          type: "VALUE_INCREASED",
          concept: "WAVE_CONDITIONS",
          previousValue: 0.8,
          currentValue: 1.5,
          absoluteChange: 0.7,
          reassessmentRelevant: true,
          detectedAt: "2026-07-13T09:00:00.000Z",
          measurement: "WAVE_HEIGHT_M",
        },
      ],
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: ["ENGINE_RELIABILITY"],
      },
      policyAction: "COORDINATOR_REVIEW_REQUIRED",
      interpretationStatus: "SUCCEEDED",
      interpretation: null,
      occurredAt: "2026-07-13T09:00:00.000Z",
    });

    expect(deltas[0]?.change).toContain("+0.7");
    expect(deltas[0]?.reassessmentCopy).toContain("TRIGGERED CONTEXTUAL REASSESSMENT");
  });

  it("returns attention basis action only for processing trace policy", () => {
    expect(
      getAttentionBasisActionStateLabel({
        kind: "PERSISTED_STATE",
        currentPosture: "REASSESSMENT_REQUIRED",
        activeConcernConcepts: [],
        materialDeltas: [],
        reassessmentDecision: null,
        policyAction: null,
        interpretationStatus: null,
        interpretation: null,
        occurredAt: "2026-07-13T06:00:00.000Z",
      }),
    ).toBeNull();

    expect(
      getAttentionBasisActionStateLabel({
        kind: "PROCESSING_TRACE",
        currentPosture: "COORDINATOR_REVIEW_REQUIRED",
        activeConcernConcepts: [],
        materialDeltas: [],
        reassessmentDecision: {
          required: true,
          reason: "MATERIAL_ENVIRONMENTAL_CHANGE",
          triggerConcepts: ["WAVE_CONDITIONS"],
        },
        policyAction: "COORDINATOR_REVIEW_REQUIRED",
        interpretationStatus: "SKIPPED",
        interpretation: null,
        occurredAt: "2026-07-13T09:00:00.000Z",
      }),
    ).toBe("COORDINATOR REVIEW REQUIRED");
  });

  it("labels vessel identity from display name", () => {
    expect(
      getVesselIdentityLabel({
        tripId: "trip-1",
        vesselId: "vessel-1",
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
        startedAt: "2026-07-13T06:00:00.000Z",
        expectedReturnAt: null,
        currentPosture: "CAUTION",
        attentionGroup: "WATCH",
        activeConcerns: [],
        stateVersion: 1,
        riskStateRecordedAt: "2026-07-13T06:00:00.000Z",
        latestManualCheckAt: null,
        latestPolicyAction: null,
        attentionBasis: {
          kind: "PERSISTED_STATE",
          currentPosture: "CAUTION",
          activeConcernConcepts: [],
          materialDeltas: [],
          reassessmentDecision: null,
          policyAction: null,
          interpretationStatus: null,
          interpretation: null,
          occurredAt: "2026-07-13T06:00:00.000Z",
        },
        latestProcessingInterpretationStatus: null,
        attentionRelevantTraceOccurredAt: null,
      }),
    ).toBe("TN-04");
  });
});
