import { isActiveConcern, type VesselConcern } from "../concern";
import { RISK_CONCEPTS, type RiskConcept } from "../risk-concepts";
import type { RiskDelta } from "./delta-types";

/**
 * Bounded reasons for deterministic contextual reassessment.
 * OFFICIAL_ALERT_CHANGED is reserved for a future authoritative alert state
 * extension; no OFFICIAL_ALERT delta is synthesized in Phase 2.
 */
export const REASSESSMENT_REASONS = [
  "NO_MATERIAL_CHANGE",
  "MATERIAL_ENVIRONMENTAL_CHANGE",
  "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
  "CONCERN_STATE_CHANGED",
  "OFFICIAL_ALERT_CHANGED",
] as const;

export type ReassessmentReason = (typeof REASSESSMENT_REASONS)[number];

/**
 * Deterministic precedence when multiple reassessment reasons apply.
 * Higher index = higher precedence.
 */
export const REASSESSMENT_REASON_PRECEDENCE: readonly ReassessmentReason[] = [
  "NO_MATERIAL_CHANGE",
  "MATERIAL_ENVIRONMENTAL_CHANGE",
  "CONCERN_STATE_CHANGED",
  "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
  "OFFICIAL_ALERT_CHANGED",
];

export interface ReassessmentEvaluation {
  required: boolean;
  reason: ReassessmentReason;
  triggerConcepts: readonly RiskConcept[];
}

function reasonPrecedence(reason: ReassessmentReason): number {
  return REASSESSMENT_REASON_PRECEDENCE.indexOf(reason);
}

function pickHigherPrecedenceReason(
  current: ReassessmentReason,
  candidate: ReassessmentReason,
): ReassessmentReason {
  return reasonPrecedence(candidate) > reasonPrecedence(current)
    ? candidate
    : current;
}

function sortTriggerConcepts(concepts: readonly RiskConcept[]): RiskConcept[] {
  const order = new Map(RISK_CONCEPTS.map((concept, index) => [concept, index]));
  return [...new Set(concepts)].sort(
    (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
  );
}

function isConcernLifecycleDelta(delta: RiskDelta): boolean {
  return (
    delta.type === "CONCERN_OPENED" ||
    delta.type === "CONCERN_CLOSED" ||
    delta.type === "CONCERN_STATUS_CHANGED"
  );
}

function isOfficialAlertDelta(delta: RiskDelta): boolean {
  return delta.concept === "OFFICIAL_ALERT";
}

/**
 * Deterministic reassessment gate over calculated deltas and current active concerns.
 * Does not invoke Gemini, mutate posture, or make maritime safety determinations.
 */
export function evaluateReassessmentNeed(
  deltas: readonly RiskDelta[],
  currentActiveConcerns: readonly VesselConcern[],
): ReassessmentEvaluation {
  if (deltas.length === 0) {
    return {
      required: false,
      reason: "NO_MATERIAL_CHANGE",
      triggerConcepts: [],
    };
  }

  let reason: ReassessmentReason = "NO_MATERIAL_CHANGE";
  const triggerConcepts: RiskConcept[] = [];

  const reassessmentRelevantMarineDeltas = deltas.filter(
    (delta) => delta.reassessmentRelevant && delta.measurement !== undefined,
  );

  const activeConcerns = currentActiveConcerns.filter(isActiveConcern);
  const hasActiveOperationalConcern = activeConcerns.length > 0;

  if (reassessmentRelevantMarineDeltas.length > 0) {
    for (const delta of reassessmentRelevantMarineDeltas) {
      triggerConcepts.push(delta.concept);
    }

    if (hasActiveOperationalConcern) {
      reason = pickHigherPrecedenceReason(
        reason,
        "MATERIAL_ENVIRONMENTAL_CHANGE_WITH_ACTIVE_CONCERN",
      );
      for (const concern of activeConcerns) {
        triggerConcepts.push(concern.concept);
      }
    } else {
      reason = pickHigherPrecedenceReason(
        reason,
        "MATERIAL_ENVIRONMENTAL_CHANGE",
      );
    }
  }

  const concernLifecycleDeltas = deltas.filter(isConcernLifecycleDelta);
  if (concernLifecycleDeltas.length > 0) {
    reason = pickHigherPrecedenceReason(reason, "CONCERN_STATE_CHANGED");
    for (const delta of concernLifecycleDeltas) {
      triggerConcepts.push(delta.concept);
    }
  }

  const officialAlertDeltas = deltas.filter(isOfficialAlertDelta);
  if (officialAlertDeltas.length > 0) {
    reason = pickHigherPrecedenceReason(reason, "OFFICIAL_ALERT_CHANGED");
    for (const delta of officialAlertDeltas) {
      triggerConcepts.push(delta.concept);
    }
  }

  return {
    required: reason !== "NO_MATERIAL_CHANGE",
    reason,
    triggerConcepts: sortTriggerConcepts(triggerConcepts),
  };
}
