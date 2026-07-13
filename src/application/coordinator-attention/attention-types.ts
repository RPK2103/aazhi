/**
 * Bounded coordinator-facing attention groups.
 * Derived deterministically from RiskPosture — never from AI ranking.
 */
export const ATTENTION_GROUPS = [
  "ATTENTION_REQUIRED",
  "WATCH",
  "STABLE",
] as const;

export type AttentionGroup = (typeof ATTENTION_GROUPS)[number];

const ATTENTION_GROUP_SET: ReadonlySet<string> = new Set(ATTENTION_GROUPS);

export function isAttentionGroup(value: string): value is AttentionGroup {
  return ATTENTION_GROUP_SET.has(value);
}

export const ATTENTION_BASIS_KINDS = [
  "PROCESSING_TRACE",
  "PERSISTED_STATE",
] as const;

export type AttentionBasisKind = (typeof ATTENTION_BASIS_KINDS)[number];
