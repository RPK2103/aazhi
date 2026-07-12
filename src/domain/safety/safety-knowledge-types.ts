import type { ConcernStatus, RiskConcept } from "@/domain/risk";
import type { SafetyAuthority } from "./safety-authorities";

/**
 * Minimal deterministic facts required for safety retrieval concept derivation.
 * Compatible with RiskInterpretationInput without importing the AI boundary.
 */
export interface SafetyRetrievalConceptSource {
  reassessmentDecision: {
    triggerConcepts: readonly RiskConcept[];
  };
  calculatedDeltas: readonly {
    concept: RiskConcept;
    reassessmentRelevant: boolean;
  }[];
  activeConcerns: readonly {
    concept: RiskConcept;
    status: ConcernStatus;
  }[];
}

/**
 * Bounded content representation for curated safety records.
 * CURATED_PARAPHRASE — conservative factual paraphrase, not verbatim official text.
 * VERBATIM_EXCERPT — exact source text manually verified (not used in Phase 6 seed).
 */
export const CONTENT_REPRESENTATIONS = [
  "CURATED_PARAPHRASE",
  "VERBATIM_EXCERPT",
] as const;

export type ContentRepresentation = (typeof CONTENT_REPRESENTATIONS)[number];

const CONTENT_REPRESENTATION_SET = new Set<string>(CONTENT_REPRESENTATIONS);

export function isContentRepresentation(
  value: unknown,
): value is ContentRepresentation {
  return typeof value === "string" && CONTENT_REPRESENTATION_SET.has(value);
}

/**
 * Curated authoritative safety context record with full source provenance.
 * No embedding fields, vector IDs, or AI-generated confidence.
 */
export interface SafetyKnowledgeRecord {
  id: string;
  authority: SafetyAuthority;
  documentTitle: string;
  jurisdiction: string;
  section: string;
  riskConcepts: readonly RiskConcept[];
  content: string;
  contentRepresentation: ContentRepresentation;
  sourceUrl: string;
  sourceLocator: string;
  version: string | null;
  effectiveDate: string | null;
  retrievalPriority: number;
  /** Documented vessel or operational scope; null when not stated in source. */
  applicabilityNote: string | null;
}

/**
 * Structured retrieval result exposing grounded and ungrounded concept coverage.
 */
export interface SafetyRetrievalResult {
  requestedConcepts: readonly RiskConcept[];
  records: readonly SafetyKnowledgeRecord[];
  groundedConcepts: readonly RiskConcept[];
  ungroundedConcepts: readonly RiskConcept[];
}

export type { SafetyRetrievalConceptSource as SafetyRetrievalConceptInput };
