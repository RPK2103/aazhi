import { describe, expect, it } from "vitest";
import type { RiskDelta } from "@/domain/risk";
import {
  expandTimelineForDisplay,
  formatMarineDelta,
  formatOperationalActionLabel,
  formatRiskPostureLabel,
  getInterpretationPresentation,
  MANUAL_MONITORING_NOTICE,
} from "@/lib/active-trip-display";

describe("active-trip display helpers", () => {
  it("formats risk posture labels", () => {
    expect(formatRiskPostureLabel("COORDINATOR_REVIEW_REQUIRED")).toBe("REVIEW REQUIRED");
  });

  it("formats operational action labels", () => {
    expect(formatOperationalActionLabel("NO_ACTION_REQUIRED")).toBe("NO NEW AAZHI ACTION");
  });

  it("renders positive wave delta", () => {
    const delta = {
      id: "d1",
      type: "VALUE_INCREASED",
      concept: "WAVE_CONDITIONS",
      measurement: "WAVE_HEIGHT_M",
      previousValue: 0.8,
      currentValue: 1.5,
      absoluteChange: 0.7,
      reassessmentRelevant: true,
      detectedAt: "2026-07-13T10:25:00.000Z",
    } satisfies RiskDelta;
    expect(formatMarineDelta(delta).change).toBe("+0.7 m");
  });

  it("preserves negative delta sign", () => {
    const delta = {
      id: "d2",
      type: "VALUE_DECREASED",
      concept: "WAVE_CONDITIONS",
      measurement: "WAVE_HEIGHT_M",
      previousValue: 1.5,
      currentValue: 0.8,
      absoluteChange: 0.7,
      reassessmentRelevant: false,
      detectedAt: "2026-07-13T10:25:00.000Z",
    } satisfies RiskDelta;
    expect(formatMarineDelta(delta).change).toBe("−0.7 m");
  });

  it("does not mark below-sensitivity delta as dangerous", () => {
    const delta = {
      id: "d3",
      type: "VALUE_INCREASED",
      concept: "WIND_CONDITIONS",
      measurement: "WIND_SPEED_KMH",
      previousValue: 13,
      currentValue: 18,
      absoluteChange: 5,
      reassessmentRelevant: false,
      detectedAt: "2026-07-13T10:25:00.000Z",
    } satisfies RiskDelta;
    const formatted = formatMarineDelta(delta);
    expect(formatted.reassessmentCopy).toBeNull();
    expect(formatted.label).toBe("WIND SPEED");
  });

  it("shows reassessment copy for relevant delta", () => {
    const delta = {
      id: "d4",
      type: "VALUE_INCREASED",
      concept: "WAVE_CONDITIONS",
      measurement: "WAVE_HEIGHT_M",
      previousValue: 0.8,
      currentValue: 1.5,
      absoluteChange: 0.7,
      reassessmentRelevant: true,
      detectedAt: "2026-07-13T10:25:00.000Z",
    } satisfies RiskDelta;
    expect(formatMarineDelta(delta).reassessmentCopy).toBe(
      "TRIGGERED CONTEXTUAL REASSESSMENT",
    );
  });

  it("shows succeeded interpretation content", () => {
    const presentation = getInterpretationPresentation({
      deltas: [],
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: ["ENGINE_RELIABILITY"],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: ["ENGINE_RELIABILITY"],
        derivedAt: "2026-07-13T10:25:00.000Z",
      },
      interpretationStatus: "SUCCEEDED",
      interpretation: {
        interactionSummary: "Summary",
        significance: "Significance",
        uncertainty: "Uncertainty",
        relevantConcepts: ["ENGINE_RELIABILITY"],
        groundingSources: [
          {
            recordId: "sk-1",
            authority: "FAO_ILO_IMO",
            documentTitle: "Machinery and electrical installations",
            section: "Engine",
            contentRepresentation: "CURATED_PARAPHRASE",
          },
        ],
      },
      previousPosture: "CAUTION",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      stateSnapshotCreated: true,
      previousStateVersion: 1,
      newStateVersion: 2,
    });
    expect(presentation.body).toContain("Summary");
    expect(presentation.groundingLines[0]).toContain("Machinery and electrical installations");
  });

  it("does not fabricate explanation on failure", () => {
    const presentation = getInterpretationPresentation({
      deltas: [],
      reassessmentDecision: {
        required: true,
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: [],
      },
      policyDecision: {
        action: "COORDINATOR_REVIEW_REQUIRED",
        reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
        triggerConcepts: [],
        derivedAt: "2026-07-13T10:25:00.000Z",
      },
      interpretationStatus: "FAILED",
      interpretation: null,
      previousPosture: "CAUTION",
      currentPosture: "COORDINATOR_REVIEW_REQUIRED",
      stateSnapshotCreated: true,
      previousStateVersion: 1,
      newStateVersion: 2,
    });
    expect(presentation.body).toContain("could not generate a grounded contextual explanation");
  });

  it("states skipped interpretation copy", () => {
    const presentation = getInterpretationPresentation({
      deltas: [],
      reassessmentDecision: {
        required: false,
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
      },
      policyDecision: {
        action: "NO_ACTION_REQUIRED",
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
        derivedAt: "2026-07-13T10:25:00.000Z",
      },
      interpretationStatus: "SKIPPED",
      interpretation: null,
      previousPosture: "CAUTION",
      currentPosture: "CAUTION",
      stateSnapshotCreated: false,
      previousStateVersion: 1,
      newStateVersion: 1,
    });
    expect(presentation.body).toContain("No contextual interpretation was needed");
  });

  it("includes manual monitoring notice constant", () => {
    expect(MANUAL_MONITORING_NOTICE).toContain("not continuously monitoring");
  });

  it("expands timeline processing trace for display", () => {
    const expanded = expandTimelineForDisplay([
      {
        id: "evt-1",
        type: "RISK_EVENT_PROCESSED",
        occurredAt: "2026-07-13T10:25:00.000Z",
        title: "Marine state update processed",
        summary: "Processed",
        processingTrace: {
          deltas: [
            {
              id: "delta-1",
              type: "VALUE_INCREASED",
              concept: "WAVE_CONDITIONS",
              measurement: "WAVE_HEIGHT_M",
              previousValue: 0.8,
              currentValue: 1.5,
              absoluteChange: 0.7,
              reassessmentRelevant: true,
              detectedAt: "2026-07-13T10:25:00.000Z",
            },
          ],
          reassessmentDecision: {
            required: true,
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["ENGINE_RELIABILITY"],
          },
          policyDecision: {
            action: "COORDINATOR_REVIEW_REQUIRED",
            reason: "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
            triggerConcepts: ["ENGINE_RELIABILITY"],
            derivedAt: "2026-07-13T10:25:00.000Z",
          },
          interpretationStatus: "SUCCEEDED",
          interpretation: null,
          previousPosture: "CAUTION",
          currentPosture: "COORDINATOR_REVIEW_REQUIRED",
          stateSnapshotCreated: true,
          previousStateVersion: 1,
          newStateVersion: 2,
        },
      },
    ]);
    expect(expanded.length).toBeGreaterThan(1);
  });
});
