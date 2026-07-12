import { isActiveConcern, RISK_CONCEPTS, type RiskConcept } from "@/domain/risk";
import { safetyAuthorityOrder } from "./safety-authorities";
import type {
  SafetyKnowledgeRecord,
  SafetyRetrievalConceptSource,
  SafetyRetrievalResult,
} from "./safety-knowledge-types";

export const DEFAULT_RETRIEVAL_LIMIT = 5;

export class InvalidRetrievalLimitError extends Error {
  constructor(limit: unknown) {
    super(
      `Invalid retrieval limit: ${String(limit)}. Limit must be a positive integer.`,
    );
    this.name = "InvalidRetrievalLimitError";
  }
}

export interface RetrieveSafetyContextInput {
  riskConcepts: readonly RiskConcept[];
  knowledge: readonly SafetyKnowledgeRecord[];
  limit?: number;
}

function normalizeConceptOrder(
  concepts: readonly RiskConcept[],
): readonly RiskConcept[] {
  const order = new Map(
    RISK_CONCEPTS.map((concept, index) => [concept, index]),
  );
  return [...new Set(concepts)].sort(
    (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
  );
}

function validateRetrievalLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new InvalidRetrievalLimitError(limit);
  }
  return limit;
}

function countMatchingConcepts(
  record: SafetyKnowledgeRecord,
  requestedConceptSet: ReadonlySet<RiskConcept>,
): number {
  let count = 0;
  for (const concept of record.riskConcepts) {
    if (requestedConceptSet.has(concept)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Deterministic retrieval ranking:
 * 1. Number of exact matching requested risk concepts (descending)
 * 2. retrievalPriority (ascending — lower priority number ranks higher)
 * 3. authority in SAFETY_AUTHORITIES stable ordering
 * 4. record ID (ascending)
 */
function compareRetrievalRecords(
  left: SafetyKnowledgeRecord,
  right: SafetyKnowledgeRecord,
  requestedConceptSet: ReadonlySet<RiskConcept>,
): number {
  const leftMatches = countMatchingConcepts(left, requestedConceptSet);
  const rightMatches = countMatchingConcepts(right, requestedConceptSet);

  if (leftMatches !== rightMatches) {
    return rightMatches - leftMatches;
  }

  if (left.retrievalPriority !== right.retrievalPriority) {
    return left.retrievalPriority - right.retrievalPriority;
  }

  const authorityDiff =
    safetyAuthorityOrder(left.authority) - safetyAuthorityOrder(right.authority);
  if (authorityDiff !== 0) {
    return authorityDiff;
  }

  return left.id.localeCompare(right.id);
}

function computeGroundedConcepts(
  records: readonly SafetyKnowledgeRecord[],
  requestedConcepts: readonly RiskConcept[],
): readonly RiskConcept[] {
  const grounded = new Set<RiskConcept>();
  for (const record of records) {
    for (const concept of record.riskConcepts) {
      if (requestedConcepts.includes(concept)) {
        grounded.add(concept);
      }
    }
  }
  return normalizeConceptOrder([...grounded]);
}

function computeUngroundedConcepts(
  requestedConcepts: readonly RiskConcept[],
  groundedConcepts: readonly RiskConcept[],
): readonly RiskConcept[] {
  const groundedSet = new Set(groundedConcepts);
  return requestedConcepts.filter((concept) => !groundedSet.has(concept));
}

/**
 * Pure deterministic safety context retrieval by exact RiskConcept mapping.
 * No semantic search, embeddings, or external calls.
 */
export function retrieveSafetyContext(
  input: RetrieveSafetyContextInput,
): SafetyRetrievalResult {
  const limit = validateRetrievalLimit(input.limit ?? DEFAULT_RETRIEVAL_LIMIT);
  const requestedConcepts = normalizeConceptOrder([...new Set(input.riskConcepts)]);

  if (requestedConcepts.length === 0) {
    return {
      requestedConcepts: [],
      records: [],
      groundedConcepts: [],
      ungroundedConcepts: [],
    };
  }

  const requestedConceptSet = new Set(requestedConcepts);

  const eligible = input.knowledge.filter((record) =>
    record.riskConcepts.some((concept) => requestedConceptSet.has(concept)),
  );

  const ranked = [...eligible].sort((left, right) =>
    compareRetrievalRecords(left, right, requestedConceptSet),
  );

  const seenIds = new Set<string>();
  const uniqueRecords: SafetyKnowledgeRecord[] = [];
  for (const record of ranked) {
    if (!seenIds.has(record.id)) {
      seenIds.add(record.id);
      uniqueRecords.push(record);
    }
  }

  const records = uniqueRecords.slice(0, limit);
  const groundedConcepts = computeGroundedConcepts(records, requestedConcepts);
  const ungroundedConcepts = computeUngroundedConcepts(
    requestedConcepts,
    groundedConcepts,
  );

  return {
    requestedConcepts,
    records,
    groundedConcepts,
    ungroundedConcepts,
  };
}

/**
 * Derives retrieval concepts from deterministic interpreter input facts only.
 * Does not inspect natural language, capability-gap metadata, or trip descriptions.
 */
export function deriveSafetyRetrievalConcepts(
  input: SafetyRetrievalConceptSource,
): readonly RiskConcept[] {
  const concepts: RiskConcept[] = [];

  for (const concept of input.reassessmentDecision.triggerConcepts) {
    concepts.push(concept);
  }

  for (const delta of input.calculatedDeltas) {
    if (delta.reassessmentRelevant) {
      concepts.push(delta.concept);
    }
  }

  for (const concern of input.activeConcerns) {
    if (isActiveConcern(concern)) {
      concepts.push(concern.concept);
    }
  }

  return normalizeConceptOrder(concepts);
}
