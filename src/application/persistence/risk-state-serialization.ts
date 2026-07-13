import { z } from "zod";
import {
  CONCERN_STATUSES,
  isValidRiskStateVersion,
  RISK_CONCEPTS,
  RISK_POSTURES,
  TRIP_STATUSES,
  type RiskState,
} from "@/domain/risk";
import { PersistenceMappingError } from "@/application/persistence/persistence-errors";

const marineRiskStateSchema = z.object({
  waveHeightM: z.number().nullable(),
  wavePeriodS: z.number().nullable(),
  windSpeedKmh: z.number().nullable(),
  windDirectionDeg: z.number().nullable(),
  capturedAt: z.string(),
});

const vesselConcernSchema = z.object({
  id: z.string(),
  vesselId: z.string(),
  concept: z.enum(RISK_CONCEPTS),
  summary: z.string(),
  status: z.enum(CONCERN_STATUSES),
  reportedAt: z.string(),
  resolutionReportedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  dismissedAt: z.string().optional(),
});

const tripContextSchema = z.object({
  tripId: z.string(),
  vesselId: z.string(),
  crewCount: z.number(),
  plannedDurationHours: z.number(),
  tripStatus: z.enum(TRIP_STATUSES),
  startedAt: z.string().optional(),
  expectedReturnAt: z.string().optional(),
  endedAt: z.string().optional(),
});

const riskStateSchema = z
  .object({
    tripContext: tripContextSchema,
    marineState: marineRiskStateSchema,
    activeConcerns: z.array(vesselConcernSchema),
    posture: z.enum(RISK_POSTURES),
    lastEvaluatedAt: z.string(),
    version: z.number(),
  })
  .superRefine((value, ctx) => {
    if (!isValidRiskStateVersion(value.version)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Risk state version must be a positive integer",
        path: ["version"],
      });
    }
  });

export function serializeRiskState(state: RiskState): unknown {
  return riskStateSchema.parse(state);
}

export function deserializeRiskState(value: unknown): RiskState {
  const parsed = riskStateSchema.safeParse(value);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path.join(".") || "stateJson";
    throw new PersistenceMappingError(
      firstIssue?.message ?? "Malformed risk state JSON",
      field,
    );
  }
  return parsed.data;
}

export function riskStatesAreEquivalent(a: RiskState, b: RiskState): boolean {
  return JSON.stringify(serializeRiskState(a)) === JSON.stringify(serializeRiskState(b));
}

export { riskStateSchema };
