import type { AazhiAssessment } from "@/lib/types";
import { aazhiAssessmentSchema } from "@/lib/validation";

export class AssessmentGenerationError extends Error {
  constructor() {
    super("The readiness brief could not be generated. Please try again.");
    this.name = "AssessmentGenerationError";
  }
}

export type AssessmentResponseParseResult =
  | { success: true; data: AazhiAssessment }
  | {
      success: false;
      stage: "GEMINI_PARSE";
      error: unknown;
    }
  | {
      success: false;
      stage: "GEMINI_ZOD_VALIDATION";
      issues: Array<{ path: string; message: string }>;
      responseKeys: string[];
    };

export function parseAssessmentResponse(
  responseText: string,
): AssessmentResponseParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    return { success: false, stage: "GEMINI_PARSE", error };
  }

  const validated = aazhiAssessmentSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      success: false,
      stage: "GEMINI_ZOD_VALIDATION",
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
