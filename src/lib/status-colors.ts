import type { AazhiAssessment, DepartureBlocker } from "@/lib/types";

export type StatusTone = "critical" | "caution" | "watch" | "ready" | "neutral";

export const STATUS_COLORS = {
  critical: "#FF5F62",
  caution: "#FFB020",
  watch: "#FFD166",
  ready: "#36D98B",
  neutral: "#5ADACE",
} as const;

export function postureTone(
  actionPosture: AazhiAssessment["actionPosture"],
): StatusTone {
  switch (actionPosture) {
    case "DO NOT DEPART YET":
      return "critical";
    case "DELAY AND REASSESS":
      return "caution";
    case "PROCEED WITH CAUTION":
      return "watch";
    case "PREPARE BEFORE DEPARTURE":
      return "ready";
    default:
      return "neutral";
  }
}

export function blockerTone(priority: DepartureBlocker["priority"]): StatusTone {
  switch (priority) {
    case "HIGH":
      return "critical";
    case "MEDIUM":
      return "caution";
    case "LOW":
      return "neutral";
    default:
      return "neutral";
  }
}

export function statusColor(tone: StatusTone): string {
  return STATUS_COLORS[tone];
}
