import { isActiveConcern, type ConcernStatus, type VesselConcern } from "../concern";
import type { RiskDelta, RiskDeltaType } from "./delta-types";

function buildConcernDeltaId(concernId: string, type: RiskDeltaType): string {
  return `concern:${concernId}:${type}`;
}

function classifyConcernTransition(
  previous: VesselConcern | undefined,
  current: VesselConcern | undefined,
): RiskDeltaType | null {
  if (previous === undefined && current === undefined) {
    return null;
  }

  if (previous === undefined && current !== undefined) {
    return "CONCERN_OPENED";
  }

  if (previous !== undefined && current === undefined) {
    return "CONCERN_CLOSED";
  }

  if (previous !== undefined && current !== undefined) {
    if (previous.status === current.status) {
      return "CONCERN_UNCHANGED";
    }

    const previousActive = isActiveConcern(previous);
    const currentActive = isActiveConcern(current);

    if (previousActive && !currentActive) {
      return "CONCERN_CLOSED";
    }

    if (!previousActive && currentActive) {
      return "CONCERN_OPENED";
    }

    return "CONCERN_STATUS_CHANGED";
  }

  return null;
}

function isOperationalConcernChange(type: RiskDeltaType): boolean {
  return (
    type === "CONCERN_OPENED" ||
    type === "CONCERN_CLOSED" ||
    type === "CONCERN_STATUS_CHANGED"
  );
}

/**
 * Compares one concern between previous and current snapshots by stable ID.
 * Returns null when the concern is unchanged.
 */
export function compareConcernById(
  concernId: string,
  previousConcern: VesselConcern | undefined,
  currentConcern: VesselConcern | undefined,
  detectedAt: string,
): RiskDelta | null {
  const type = classifyConcernTransition(previousConcern, currentConcern);

  if (type === null || type === "CONCERN_UNCHANGED") {
    return null;
  }

  const concept = (currentConcern ?? previousConcern)!.concept;

  return {
    id: buildConcernDeltaId(concernId, type),
    type,
    concept,
    concernId,
    previousValue: previousConcern?.status ?? null,
    currentValue: currentConcern?.status ?? null,
    reassessmentRelevant: isOperationalConcernChange(type),
    detectedAt,
  };
}

function indexConcernsById(
  concerns: readonly VesselConcern[],
): ReadonlyMap<string, VesselConcern> {
  const map = new Map<string, VesselConcern>();
  for (const concern of concerns) {
    map.set(concern.id, concern);
  }
  return map;
}

/**
 * Compares concern sets between two risk-state snapshots.
 * Unchanged concerns are omitted from the result.
 * Output is sorted by concern ID.
 */
export function calculateConcernDeltas(
  previousConcerns: readonly VesselConcern[],
  currentConcerns: readonly VesselConcern[],
  detectedAt: string,
): readonly RiskDelta[] {
  const previousById = indexConcernsById(previousConcerns);
  const currentById = indexConcernsById(currentConcerns);
  const concernIds = [
    ...new Set([...previousById.keys(), ...currentById.keys()]),
  ].sort();

  const deltas: RiskDelta[] = [];

  for (const concernId of concernIds) {
    const delta = compareConcernById(
      concernId,
      previousById.get(concernId),
      currentById.get(concernId),
      detectedAt,
    );
    if (delta !== null) {
      deltas.push(delta);
    }
  }

  return deltas;
}

export type { ConcernStatus };
