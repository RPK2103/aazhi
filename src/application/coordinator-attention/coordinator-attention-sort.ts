import type { CoordinatorTripAttentionDTO } from "./coordinator-attention-dto";
import { getRiskPostureAttentionPriority } from "./attention-priority";

export function sortCoordinatorAttentionTrips(
  trips: readonly CoordinatorTripAttentionDTO[],
): CoordinatorTripAttentionDTO[] {
  return [...trips].sort((a, b) => {
    const postureCompare =
      getRiskPostureAttentionPriority(a.currentPosture) -
      getRiskPostureAttentionPriority(b.currentPosture);
    if (postureCompare !== 0) {
      return postureCompare;
    }

    const aHasRelevantTrace = a.attentionRelevantTraceOccurredAt !== null;
    const bHasRelevantTrace = b.attentionRelevantTraceOccurredAt !== null;

    if (aHasRelevantTrace && !bHasRelevantTrace) {
      return -1;
    }
    if (!aHasRelevantTrace && bHasRelevantTrace) {
      return 1;
    }

    if (aHasRelevantTrace && bHasRelevantTrace) {
      const traceCompare = b.attentionRelevantTraceOccurredAt!.localeCompare(
        a.attentionRelevantTraceOccurredAt!,
      );
      if (traceCompare !== 0) {
        return traceCompare;
      }
    }

    const aStarted = a.startedAt ?? "";
    const bStarted = b.startedAt ?? "";
    const startedCompare = aStarted.localeCompare(bStarted);
    if (startedCompare !== 0) {
      return startedCompare;
    }

    return a.tripId.localeCompare(b.tripId);
  });
}

export function groupTripsByAttention(
  sortedTrips: readonly CoordinatorTripAttentionDTO[],
): {
  attentionRequired: CoordinatorTripAttentionDTO[];
  watch: CoordinatorTripAttentionDTO[];
  stable: CoordinatorTripAttentionDTO[];
} {
  const attentionRequired: CoordinatorTripAttentionDTO[] = [];
  const watch: CoordinatorTripAttentionDTO[] = [];
  const stable: CoordinatorTripAttentionDTO[] = [];

  for (const trip of sortedTrips) {
    switch (trip.attentionGroup) {
      case "ATTENTION_REQUIRED":
        attentionRequired.push(trip);
        break;
      case "WATCH":
        watch.push(trip);
        break;
      case "STABLE":
        stable.push(trip);
        break;
    }
  }

  return { attentionRequired, watch, stable };
}

export function buildCoordinatorAttentionSummary(
  trips: readonly CoordinatorTripAttentionDTO[],
): import("./coordinator-attention-dto").CoordinatorAttentionSummary {
  let attentionRequiredCount = 0;
  let watchCount = 0;
  let stableCount = 0;
  let notCheckedYetCount = 0;

  for (const trip of trips) {
    switch (trip.attentionGroup) {
      case "ATTENTION_REQUIRED":
        attentionRequiredCount += 1;
        break;
      case "WATCH":
        watchCount += 1;
        break;
      case "STABLE":
        stableCount += 1;
        break;
    }

    if (trip.latestManualCheckAt === null) {
      notCheckedYetCount += 1;
    }
  }

  return {
    totalActiveTrips: trips.length,
    attentionRequiredCount,
    watchCount,
    stableCount,
    notCheckedYetCount,
  };
}
