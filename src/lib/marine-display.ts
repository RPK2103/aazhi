/**
 * Presentation-only normalization for marine metric micro-bars.
 * Display domains are conservative operational reference ranges — not risk scores.
 */

export type MarineMetricKey =
  | "waveHeight"
  | "wavePeriod"
  | "windWaveHeight"
  | "swellWaveHeight";

const DISPLAY_DOMAINS: Record<
  MarineMetricKey,
  { min: number; max: number } | null
> = {
  waveHeight: { min: 0, max: 4 },
  wavePeriod: { min: 0, max: 14 },
  windWaveHeight: { min: 0, max: 3 },
  swellWaveHeight: { min: 0, max: 3 },
};

export function normalizeMarineMetricForDisplay(
  metric: MarineMetricKey,
  value: number | null,
): number {
  if (value === null) return 0.12;
  const domain = DISPLAY_DOMAINS[metric];
  if (!domain) return 0.35;
  const clamped = Math.min(domain.max, Math.max(domain.min, value));
  const range = domain.max - domain.min;
  if (range <= 0) return 0.35;
  return Math.min(1, Math.max(0.08, (clamped - domain.min) / range));
}
