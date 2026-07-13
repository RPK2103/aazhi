import type { RiskConcept } from "@/domain/risk";

export const MANUAL_CARRY_FORWARD_CONCEPTS = [
  "ENGINE_RELIABILITY",
  "HULL_INTEGRITY",
  "VESSEL_STABILITY",
  "PRIMARY_COMMUNICATION",
  "COMMUNICATION_REDUNDANCY",
  "SAFETY_EQUIPMENT",
] as const satisfies readonly RiskConcept[];

export type ManualCarryForwardConcept = (typeof MANUAL_CARRY_FORWARD_CONCEPTS)[number];

const MANUAL_CARRY_FORWARD_SET: ReadonlySet<string> = new Set(MANUAL_CARRY_FORWARD_CONCEPTS);

export function isManualCarryForwardConcept(value: string): value is ManualCarryForwardConcept {
  return MANUAL_CARRY_FORWARD_SET.has(value);
}

export const ENVIRONMENTAL_CONCEPTS = [
  "WAVE_CONDITIONS",
  "WIND_CONDITIONS",
  "OFFICIAL_ALERT",
  "TRIP_DURATION",
  "CHECK_IN_STATUS",
] as const satisfies readonly RiskConcept[];

export function isEnvironmentalOrSystemConcept(value: string): boolean {
  return (ENVIRONMENTAL_CONCEPTS as readonly string[]).includes(value);
}
