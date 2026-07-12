import {
  isActiveConcern,
  normalizeMarineNumber,
  type ReassessmentEvaluation,
  type RiskDelta,
  type RiskState,
} from "@/domain/risk";
import type { RiskInterpretationInput } from "./risk-interpreter-types";

function copyRiskDelta(delta: RiskDelta): RiskDelta {
  return { ...delta };
}

function copyReassessmentDecision(
  decision: ReassessmentEvaluation,
): ReassessmentEvaluation {
  return {
    required: decision.required,
    reason: decision.reason,
    triggerConcepts: [...decision.triggerConcepts],
  };
}

/**
 * Pure deterministic builder: extracts interpreter input from current state,
 * pre-calculated deltas, and reassessment output. Does not compute new deltas.
 */
export function buildRiskInterpretationInput(
  currentRiskState: RiskState,
  calculatedDeltas: readonly RiskDelta[],
  reassessmentDecision: ReassessmentEvaluation,
): RiskInterpretationInput {
  return {
    tripContext: { ...currentRiskState.tripContext },
    activeConcerns: currentRiskState.activeConcerns
      .filter(isActiveConcern)
      .map((concern) => ({ ...concern })),
    calculatedDeltas: calculatedDeltas.map(copyRiskDelta),
    reassessmentDecision: copyReassessmentDecision(reassessmentDecision),
  };
}

/**
 * Deterministic gate: invoke the Risk Interpreter only when reassessment is required.
 */
export function shouldInvokeRiskInterpreter(
  reassessmentDecision: ReassessmentEvaluation,
): boolean {
  return reassessmentDecision.required === true;
}

export interface SerializedRiskDelta {
  type: RiskDelta["type"];
  concept: RiskDelta["concept"];
  measurement?: RiskDelta["measurement"];
  concernId?: string;
  previousValue: RiskDelta["previousValue"];
  currentValue: RiskDelta["currentValue"];
  signedChange?: number;
  absoluteChange?: number;
  reassessmentRelevant: boolean;
}

export function computeSignedChange(delta: RiskDelta): number | undefined {
  if (
    typeof delta.previousValue === "number" &&
    typeof delta.currentValue === "number"
  ) {
    return normalizeMarineNumber(delta.currentValue - delta.previousValue);
  }
  return undefined;
}

export function serializeRiskDeltas(
  deltas: readonly RiskDelta[],
): SerializedRiskDelta[] {
  return deltas.map((delta) => {
    const signedChange = computeSignedChange(delta);
    return {
      type: delta.type,
      concept: delta.concept,
      ...(delta.measurement !== undefined
        ? { measurement: delta.measurement }
        : {}),
      ...(delta.concernId !== undefined ? { concernId: delta.concernId } : {}),
      previousValue: delta.previousValue,
      currentValue: delta.currentValue,
      ...(signedChange !== undefined ? { signedChange } : {}),
      ...(delta.absoluteChange !== undefined
        ? { absoluteChange: delta.absoluteChange }
        : {}),
      reassessmentRelevant: delta.reassessmentRelevant,
    };
  });
}
