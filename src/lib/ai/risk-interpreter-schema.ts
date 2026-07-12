import { z } from "zod";
import { RISK_CONCEPTS } from "@/domain/risk";
import { SAFETY_AUTHORITIES } from "@/domain/safety";
import type { RiskInterpretation } from "./risk-interpreter-types";

const interpretationText = z.string().trim().min(1).max(800);

const groundingSourceSchema = z
  .object({
    recordId: z.string().trim().min(1),
    authority: z.enum(SAFETY_AUTHORITIES),
    documentTitle: z.string().trim().min(1),
    sourceLocator: z.string().trim().min(1),
    sourceUrl: z.string().trim().min(1),
  })
  .strict();

export const riskInterpretationSchema = z
  .object({
    interactionSummary: interpretationText,
    significance: interpretationText,
    uncertainty: interpretationText,
    relevantConcepts: z
      .array(z.enum(RISK_CONCEPTS))
      .min(1)
      .max(RISK_CONCEPTS.length),
    groundingSources: z.array(groundingSourceSchema),
  })
  .strict();

export type RiskInterpretationParseResult =
  | { success: true; data: RiskInterpretation }
  | {
      success: false;
      stage: "INTERPRETER_PARSE";
      error: unknown;
    }
  | {
      success: false;
      stage: "INTERPRETER_ZOD_VALIDATION";
      issues: Array<{ path: string; message: string }>;
      responseKeys: string[];
    };

export function parseRiskInterpretationResponse(
  responseText: string,
): RiskInterpretationParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    return { success: false, stage: "INTERPRETER_PARSE", error };
  }

  const validated = riskInterpretationSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      success: false,
      stage: "INTERPRETER_ZOD_VALIDATION",
      issues: validated.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      responseKeys:
        parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
    };
  }

  return { success: true, data: validated.data };
}

export const RISK_INTERPRETATION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "interactionSummary",
    "significance",
    "uncertainty",
    "relevantConcepts",
    "groundingSources",
  ],
  properties: {
    interactionSummary: { type: "string", minLength: 1, maxLength: 800 },
    significance: { type: "string", minLength: 1, maxLength: 800 },
    uncertainty: { type: "string", minLength: 1, maxLength: 800 },
    relevantConcepts: {
      type: "array",
      minItems: 1,
      maxItems: RISK_CONCEPTS.length,
      items: { type: "string", enum: [...RISK_CONCEPTS] },
    },
    groundingSources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "recordId",
          "authority",
          "documentTitle",
          "sourceLocator",
          "sourceUrl",
        ],
        properties: {
          recordId: { type: "string", minLength: 1 },
          authority: { type: "string", enum: [...SAFETY_AUTHORITIES] },
          documentTitle: { type: "string", minLength: 1 },
          sourceLocator: { type: "string", minLength: 1 },
          sourceUrl: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;
