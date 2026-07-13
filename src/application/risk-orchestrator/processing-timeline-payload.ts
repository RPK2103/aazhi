import { z } from "zod";
import {
  CONCERN_STATUSES,
  MARINE_MEASUREMENTS,
  REASSESSMENT_REASONS,
  RISK_CONCEPTS,
  RISK_DELTA_TYPES,
  RISK_POSTURES,
  isRiskEventType,
  type ReassessmentEvaluation,
  type RiskDelta,
} from "@/domain/risk";
import { OPERATIONAL_ACTIONS } from "@/domain/policy/operational-actions";
import { riskInterpretationSchema } from "@/lib/ai/risk-interpreter-schema";
import {
  INTERPRETATION_FAILURE_REASONS,
  INTERPRETATION_STATUSES,
  MalformedProcessingTimelinePayloadError,
  type InterpretationFailureReason,
  type InterpretationStatus,
  type RiskEventProcessingResult,
} from "./risk-orchestrator-types";

const riskDeltaSchema = z.object({
  id: z.string(),
  type: z.enum(RISK_DELTA_TYPES),
  concept: z.enum(RISK_CONCEPTS),
  previousValue: z.union([z.number(), z.enum(CONCERN_STATUSES), z.null()]),
  currentValue: z.union([z.number(), z.enum(CONCERN_STATUSES), z.null()]),
  absoluteChange: z.number().optional(),
  reassessmentRelevant: z.boolean(),
  detectedAt: z.string(),
  measurement: z.enum(MARINE_MEASUREMENTS).optional(),
  concernId: z.string().optional(),
});

const reassessmentDecisionSchema = z.object({
  required: z.boolean(),
  reason: z.enum(REASSESSMENT_REASONS),
  triggerConcepts: z.array(z.enum(RISK_CONCEPTS)),
});

const policyDecisionSchema = z.object({
  action: z.enum(OPERATIONAL_ACTIONS),
  reason: z.enum(REASSESSMENT_REASONS),
  triggerConcepts: z.array(z.enum(RISK_CONCEPTS)),
  derivedAt: z.string(),
});

const processingTimelinePayloadSchema = z
  .object({
    sourceEventId: z.string(),
    sourceEventType: z.string().refine(isRiskEventType, "Unsupported risk event type"),
    previousStateVersion: z.number().int().positive(),
    newStateVersion: z.number().int().positive(),
    stateSnapshotCreated: z.boolean(),
    deltas: z.array(riskDeltaSchema),
    reassessmentDecision: reassessmentDecisionSchema,
    policyDecision: policyDecisionSchema,
    interpretationStatus: z.enum(INTERPRETATION_STATUSES),
    interpretation: riskInterpretationSchema.nullable(),
    interpretationFailureReason: z.enum(INTERPRETATION_FAILURE_REASONS).nullable(),
    previousPosture: z.enum(RISK_POSTURES),
    currentPosture: z.enum(RISK_POSTURES),
    processedAt: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.interpretationStatus === "SUCCEEDED" && value.interpretation === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "interpretation is required when interpretationStatus is SUCCEEDED",
        path: ["interpretation"],
      });
    }
    if (value.interpretationStatus !== "SUCCEEDED" && value.interpretation !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "interpretation must be null unless interpretationStatus is SUCCEEDED",
        path: ["interpretation"],
      });
    }
    if (value.interpretationStatus === "FAILED" && value.interpretationFailureReason === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "interpretationFailureReason is required when interpretationStatus is FAILED",
        path: ["interpretationFailureReason"],
      });
    }
    if (
      value.interpretationStatus !== "FAILED" &&
      value.interpretationFailureReason !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "interpretationFailureReason must be null unless interpretationStatus is FAILED",
        path: ["interpretationFailureReason"],
      });
    }
    if (
      value.stateSnapshotCreated &&
      value.newStateVersion !== value.previousStateVersion + 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "newStateVersion must increment by one when a snapshot is created",
        path: ["newStateVersion"],
      });
    }
    if (
      !value.stateSnapshotCreated &&
      value.newStateVersion !== value.previousStateVersion
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "newStateVersion must equal previousStateVersion when no snapshot is created",
        path: ["newStateVersion"],
      });
    }
  });

export function buildProcessingTimelinePayload(
  result: RiskEventProcessingResult,
): Record<string, unknown> {
  return {
    sourceEventId: result.eventId,
    sourceEventType: result.eventType,
    previousStateVersion: result.previousStateVersion,
    newStateVersion: result.newStateVersion,
    stateSnapshotCreated: result.stateSnapshotCreated,
    deltas: result.deltas.map((delta) => ({ ...delta })),
    reassessmentDecision: {
      required: result.reassessmentDecision.required,
      reason: result.reassessmentDecision.reason,
      triggerConcepts: [...result.reassessmentDecision.triggerConcepts],
    },
    policyDecision: {
      action: result.policyDecision.action,
      reason: result.policyDecision.reason,
      triggerConcepts: [...result.policyDecision.triggerConcepts],
      derivedAt: result.policyDecision.derivedAt,
    },
    interpretationStatus: result.interpretationStatus,
    interpretation: result.interpretation,
    interpretationFailureReason: result.interpretationFailureReason,
    previousPosture: result.previousPosture,
    currentPosture: result.currentPosture,
    processedAt: result.processedAt,
  };
}

export function reconstructProcessingResultFromTimelinePayload(
  payload: Record<string, unknown>,
): RiskEventProcessingResult {
  const parsed = processingTimelinePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new MalformedProcessingTimelinePayloadError(
      firstIssue?.message ?? "Malformed RISK_EVENT_PROCESSED timeline payload",
    );
  }

  const value = parsed.data;
  return {
    eventId: value.sourceEventId,
    tripId: "",
    eventType: value.sourceEventType,
    duplicateEvent: true,
    previousStateVersion: value.previousStateVersion,
    newStateVersion: value.newStateVersion,
    stateSnapshotCreated: value.stateSnapshotCreated,
    deltas: value.deltas as RiskDelta[],
    reassessmentDecision: value.reassessmentDecision as ReassessmentEvaluation,
    policyDecision: value.policyDecision,
    interpretationStatus: value.interpretationStatus as InterpretationStatus,
    interpretation: value.interpretation,
    interpretationFailureReason:
      value.interpretationFailureReason as InterpretationFailureReason | null,
    previousPosture: value.previousPosture,
    currentPosture: value.currentPosture,
    processedAt: value.processedAt,
  };
}

export const REQUIRED_PROCESSING_TRACE_FIELDS = [
  "sourceEventId",
  "sourceEventType",
  "previousStateVersion",
  "newStateVersion",
  "stateSnapshotCreated",
  "deltas",
  "reassessmentDecision",
  "policyDecision",
  "interpretationStatus",
  "interpretation",
  "interpretationFailureReason",
  "previousPosture",
  "currentPosture",
  "processedAt",
] as const;

export function processingTraceHasRequiredFields(
  payload: Record<string, unknown>,
): boolean {
  return REQUIRED_PROCESSING_TRACE_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(payload, field),
  );
}
