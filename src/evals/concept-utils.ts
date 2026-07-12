import { RISK_CONCEPTS, type RiskConcept } from "@/domain/risk";

/** Normalizes concept lists to deterministic RISK_CONCEPTS vocabulary order. */
export function normalizeConceptOrder(
  concepts: readonly RiskConcept[],
): readonly RiskConcept[] {
  const order = new Map(
    RISK_CONCEPTS.map((concept, index) => [concept, index]),
  );
  return [...new Set(concepts)].sort(
    (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
  );
}

/** Exact set match after deterministic normalization; ordering is ignored. */
export function conceptsExactMatch(
  expected: readonly RiskConcept[],
  actual: readonly RiskConcept[],
): boolean {
  const normalizedExpected = normalizeConceptOrder(expected);
  const normalizedActual = normalizeConceptOrder(actual);
  if (normalizedExpected.length !== normalizedActual.length) {
    return false;
  }
  return normalizedExpected.every(
    (concept, index) => concept === normalizedActual[index],
  );
}
