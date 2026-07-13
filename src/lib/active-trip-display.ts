import type { RiskDelta, RiskPosture } from "@/domain/risk";
import type { OperationalAction } from "@/domain/policy/operational-actions";
import type {
  ActiveTripProcessingTraceDto,
  ActiveTripTimelineEntry,
} from "@/application/active-trip";
import type { RiskInterpretation } from "@/lib/ai/risk-interpreter-types";

export const MANUAL_MONITORING_NOTICE =
  "Manual update — AAZHI is not continuously monitoring this trip.";

const RISK_POSTURE_LABELS: Record<RiskPosture, string> = {
  BASELINE: "BASELINE",
  CAUTION: "CAUTION",
  REASSESSMENT_REQUIRED: "REASSESSMENT REQUIRED",
  COORDINATOR_REVIEW_REQUIRED: "REVIEW REQUIRED",
  OFFICIAL_ALERT_PRIORITY: "OFFICIAL ALERT PRIORITY",
};

const OPERATIONAL_ACTION_LABELS: Record<OperationalAction, string> = {
  NO_ACTION_REQUIRED: "NO NEW AAZHI ACTION",
  REASSESSMENT_REQUIRED: "REASSESSMENT REQUIRED",
  COORDINATOR_REVIEW_REQUIRED: "COORDINATOR REVIEW REQUIRED",
  OFFICIAL_ALERT_PRIORITY: "OFFICIAL ALERT PRIORITY",
};

export function formatRiskPostureLabel(posture: RiskPosture): string {
  return RISK_POSTURE_LABELS[posture];
}

export function formatOperationalActionLabel(action: OperationalAction): string {
  return OPERATIONAL_ACTION_LABELS[action];
}

function formatSignedDelta(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const magnitude = Math.abs(value);
  return `${sign}${magnitude} ${unit}`;
}

export function formatMarineDelta(delta: RiskDelta): {
  label: string;
  previous: string;
  current: string;
  change: string;
  reassessmentCopy: string | null;
} {
  const unit = delta.measurement === "WIND_SPEED_KMH" ? "km/h" : "m";
  const label =
    delta.measurement === "WIND_SPEED_KMH"
      ? "WIND SPEED"
      : delta.measurement === "WAVE_HEIGHT_M"
        ? "WAVE HEIGHT"
        : delta.measurement?.replaceAll("_", " ") ?? "RECORDED STATE CHANGE";

  const previous =
    typeof delta.previousValue === "number"
      ? `${delta.previousValue} ${unit}`
      : "Not available";
  const current =
    typeof delta.currentValue === "number"
      ? `${delta.currentValue} ${unit}`
      : "Not available";
  const change =
    typeof delta.absoluteChange === "number"
      ? formatSignedDelta(
          delta.type === "VALUE_DECREASED"
            ? -delta.absoluteChange
            : delta.absoluteChange,
          unit,
        )
      : "Not available";

  return {
    label,
    previous,
    current,
    change,
    reassessmentCopy: delta.reassessmentRelevant
      ? "TRIGGERED CONTEXTUAL REASSESSMENT"
      : null,
  };
}

export function getInterpretationPresentation(
  trace: ActiveTripProcessingTraceDto | null,
): {
  heading: string;
  body: string | null;
  groundingLines: string[];
} {
  if (!trace) {
    return { heading: "CONTEXTUAL EXPLANATION", body: null, groundingLines: [] };
  }

  if (trace.interpretationStatus === "SUCCEEDED" && trace.interpretation) {
    return {
      heading: "CONTEXTUAL EXPLANATION",
      body: [
        trace.interpretation.interactionSummary,
        trace.interpretation.significance,
        trace.interpretation.uncertainty,
      ]
        .filter(Boolean)
        .join(" "),
      groundingLines: formatGroundingSources(trace.interpretation),
    };
  }

  if (trace.interpretationStatus === "FAILED") {
    return {
      heading: "CONTEXTUAL EXPLANATION",
      body: "AAZHI could not generate a grounded contextual explanation for this update.",
      groundingLines: [],
    };
  }

  return {
    heading: "CONTEXTUAL EXPLANATION",
    body: "No contextual interpretation was needed for this recorded state change.",
    groundingLines: [],
  };
}

export function formatGroundingSources(interpretation: RiskInterpretation): string[] {
  return interpretation.groundingSources.map((source) => {
    const authority = source.authority.replaceAll("_", " / ");
    return `${authority} — ${source.documentTitle}`;
  });
}

export function expandTimelineForDisplay(
  entries: readonly ActiveTripTimelineEntry[],
): ActiveTripTimelineEntry[] {
  const expanded: ActiveTripTimelineEntry[] = [];

  for (const entry of entries) {
    expanded.push(entry);

    if (entry.type !== "RISK_EVENT_PROCESSED" || !entry.processingTrace) {
      continue;
    }

    for (const delta of entry.processingTrace.deltas) {
      if (delta.type === "VALUE_UNCHANGED") continue;
      const formatted = formatMarineDelta(delta);
      expanded.push({
        id: `${entry.id}-delta-${delta.id}`,
        type: entry.type,
        occurredAt: entry.occurredAt,
        title: "Recorded state change",
        summary: `${formatted.label} changed by ${formatted.change}`,
      });
    }

    if (entry.processingTrace.reassessmentDecision.required) {
      expanded.push({
        id: `${entry.id}-reassessment`,
        type: entry.type,
        occurredAt: entry.occurredAt,
        title: "Contextual reassessment triggered",
        summary: "Deterministic reassessment gate recorded a material contextual change.",
      });
    }

    if (entry.processingTrace.previousPosture !== entry.processingTrace.currentPosture) {
      expanded.push({
        id: `${entry.id}-posture`,
        type: entry.type,
        occurredAt: entry.occurredAt,
        title: "Posture changed",
        summary: `Posture changed to ${formatRiskPostureLabel(entry.processingTrace.currentPosture)}.`,
      });
    }
  }

  return expanded;
}

export function formatMarineMeasurement(
  value: number | null,
  unit: string,
): string {
  return value === null ? "Not available" : `${value} ${unit}`;
}

export function formatWindDirection(value: number | null): string {
  return value === null ? "Not available" : `${value}°`;
}
