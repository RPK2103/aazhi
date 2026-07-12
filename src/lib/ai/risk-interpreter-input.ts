import {
  isActiveConcern,
  normalizeMarineNumber,
  type ReassessmentEvaluation,
  type RiskDelta,
  type RiskState,
} from "@/domain/risk";
import {
  deriveSafetyRetrievalConcepts,
  retrieveSafetyContext,
  type SafetyKnowledgeRecord,
} from "@/domain/safety";
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

function copySafetyRecord(
  record: SafetyKnowledgeRecord,
): SafetyKnowledgeRecord {
  return {
    ...record,
    riskConcepts: [...record.riskConcepts],
  };
}

export interface BuildRiskInterpretationInputOptions {
  retrievalLimit?: number;
}

/**
 * Pure deterministic builder: extracts interpreter input from current state,
 * pre-calculated deltas, reassessment output, and injected safety knowledge.
 * Does not compute new deltas.
 */
export function buildRiskInterpretationInput(
  currentRiskState: RiskState,
  calculatedDeltas: readonly RiskDelta[],
  reassessmentDecision: ReassessmentEvaluation,
  safetyKnowledge: readonly SafetyKnowledgeRecord[],
  options?: BuildRiskInterpretationInputOptions,
): RiskInterpretationInput {
  const baseInput: RiskInterpretationInput = {
    tripContext: { ...currentRiskState.tripContext },
    activeConcerns: currentRiskState.activeConcerns
      .filter(isActiveConcern)
      .map((concern) => ({ ...concern })),
    calculatedDeltas: calculatedDeltas.map(copyRiskDelta),
    reassessmentDecision: copyReassessmentDecision(reassessmentDecision),
    safetyContext: [],
  };

  const retrievalConcepts = deriveSafetyRetrievalConcepts(baseInput);
  const retrievalResult = retrieveSafetyContext({
    riskConcepts: retrievalConcepts,
    knowledge: safetyKnowledge,
    limit: options?.retrievalLimit,
  });

  return {
    ...baseInput,
    safetyContext: retrievalResult.records.map(copySafetyRecord),
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
