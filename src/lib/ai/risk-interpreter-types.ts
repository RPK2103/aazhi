import type {
  ReassessmentEvaluation,
  RiskConcept,
  RiskDelta,
  TripContext,
  VesselConcern,
} from "@/domain/risk";

/**
 * Provider-independent input for the AAZHI Risk Interpreter.
 * Contains only deterministic facts — no raw RiskState snapshots or provider JSON.
 */
export interface RiskInterpretationInput {
  tripContext: TripContext;
  activeConcerns: readonly VesselConcern[];
  calculatedDeltas: readonly RiskDelta[];
  reassessmentDecision: ReassessmentEvaluation;
}

/**
 * Structured AI interpretation over deterministic risk context.
 * Explains interaction only — does not command, score, or decide reassessment.
 */
export interface RiskInterpretation {
  interactionSummary: string;
  significance: string;
  uncertainty: string;
  relevantConcepts: readonly RiskConcept[];
}
