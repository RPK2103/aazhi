import type {
  ReassessmentEvaluation,
  RiskConcept,
  RiskDelta,
  TripContext,
  VesselConcern,
} from "@/domain/risk";
import type { SafetyKnowledgeRecord } from "@/domain/safety";
import type { SafetyAuthority } from "@/domain/safety";

/**
 * Reference to a retrieved safety knowledge record cited in interpretation output.
 */
export interface GroundingSourceReference {
  recordId: string;
  authority: SafetyAuthority;
  documentTitle: string;
  sourceLocator: string;
  sourceUrl: string;
}

/**
 * Provider-independent input for the AAZHI Risk Interpreter.
 * Contains only deterministic facts — no raw RiskState snapshots or provider JSON.
 */
export interface RiskInterpretationInput {
  tripContext: TripContext;
  activeConcerns: readonly VesselConcern[];
  calculatedDeltas: readonly RiskDelta[];
  reassessmentDecision: ReassessmentEvaluation;
  safetyContext: readonly SafetyKnowledgeRecord[];
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
  groundingSources: readonly GroundingSourceReference[];
}
