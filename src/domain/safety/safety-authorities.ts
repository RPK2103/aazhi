/**
 * Bounded safety authority vocabulary for curated retrieval provenance.
 * Only official authority families are permitted in Phase 6.
 */
export const SAFETY_AUTHORITIES = [
  "FAO",
  "IMO",
  "ILO",
  "FAO_ILO_IMO",
  "INCOIS",
  "INDIA_FISHERIES_AUTHORITY",
] as const;

export type SafetyAuthority = (typeof SAFETY_AUTHORITIES)[number];

const SAFETY_AUTHORITY_SET = new Set<string>(SAFETY_AUTHORITIES);

export function isSafetyAuthority(value: unknown): value is SafetyAuthority {
  return typeof value === "string" && SAFETY_AUTHORITY_SET.has(value);
}

/** Deterministic stable ordering index for retrieval tie-breaking. */
export function safetyAuthorityOrder(authority: SafetyAuthority): number {
  return SAFETY_AUTHORITIES.indexOf(authority);
}
