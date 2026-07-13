import type {
  GroundingSourceReference,
  RiskInterpretationInput,
  RiskInterpretation,
} from "./risk-interpreter-types";
import { parseRiskInterpretationResponse } from "./risk-interpreter-schema";

export const RISK_INTERPRETATION_FAILURE_STAGES = [
  "INTERPRETER_PROVIDER",
  "INTERPRETER_PARSE",
  "INTERPRETER_ZOD_VALIDATION",
  "INTERPRETER_GROUNDING_VALIDATION",
  "UNKNOWN",
] as const;

export type RiskInterpretationFailureStage =
  (typeof RISK_INTERPRETATION_FAILURE_STAGES)[number];

export class RiskInterpretationError extends Error {
  readonly failureStage: RiskInterpretationFailureStage;

  constructor(failureStage: RiskInterpretationFailureStage = "UNKNOWN") {
    super("The risk interpretation could not be generated.");
    this.name = "RiskInterpretationError";
    this.failureStage = failureStage;
  }
}

export interface RiskInterpreterProvider {
  interpret(input: RiskInterpretationInput): Promise<unknown>;
}

type DiagnosticStage =
  | "INTERPRETER_PROVIDER"
  | "INTERPRETER_PARSE"
  | "INTERPRETER_ZOD_VALIDATION"
  | "INTERPRETER_GROUNDING_VALIDATION";

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError", message: String(error) };
  }

  const providerError = error as Error & {
    status?: unknown;
    code?: unknown;
  };
  return {
    errorName: error.name,
    status:
      typeof providerError.status === "number" ? providerError.status : undefined,
    code:
      typeof providerError.code === "string" ||
      typeof providerError.code === "number"
        ? providerError.code
        : undefined,
    message: error.message.slice(0, 1000),
  };
}

function logInterpreterFailure(stage: DiagnosticStage, error: unknown) {
  console.error("[AAZHI_RISK_INTERPRETER_FAILURE]", {
    stage,
    ...safeErrorDetails(error),
  });
}

function logGroundingValidationFailure(
  source: GroundingSourceReference,
  reason: string,
) {
  console.error("[AAZHI_RISK_INTERPRETER_FAILURE]", {
    stage: "INTERPRETER_GROUNDING_VALIDATION",
    reason,
    recordId: source.recordId,
  });
}

function validateGroundingSources(
  interpretation: RiskInterpretation,
  safetyContext: RiskInterpretationInput["safetyContext"],
): void {
  const contextById = new Map(
    safetyContext.map((record) => [record.id, record]),
  );

  for (const source of interpretation.groundingSources) {
    const record = contextById.get(source.recordId);
    if (record === undefined) {
      logGroundingValidationFailure(source, "unknown_record_id");
      throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
    }

    if (source.authority !== record.authority) {
      logGroundingValidationFailure(source, "fabricated_authority");
      throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
    }

    if (source.documentTitle !== record.documentTitle) {
      logGroundingValidationFailure(source, "fabricated_document_title");
      throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
    }

    if (source.sourceLocator !== record.sourceLocator) {
      logGroundingValidationFailure(source, "fabricated_source_locator");
      throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
    }

    if (source.sourceUrl !== record.sourceUrl) {
      logGroundingValidationFailure(source, "fabricated_source_url");
      throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
    }
  }
}

function validateProviderOutput(
  raw: unknown,
  input: RiskInterpretationInput,
): RiskInterpretation {
  const responseText =
    typeof raw === "string" ? raw : JSON.stringify(raw ?? null);

  const parsed = parseRiskInterpretationResponse(responseText);
  if (!parsed.success && parsed.stage === "INTERPRETER_PARSE") {
    logInterpreterFailure("INTERPRETER_PARSE", parsed.error);
    throw new RiskInterpretationError("INTERPRETER_PARSE");
  }
  if (!parsed.success) {
    console.error("[AAZHI_RISK_INTERPRETER_FAILURE]", {
      stage: "INTERPRETER_ZOD_VALIDATION",
      errorName: "ZodError",
      issues: parsed.issues,
      responseKeys: parsed.responseKeys,
    });
    throw new RiskInterpretationError("INTERPRETER_ZOD_VALIDATION");
  }

  try {
    validateGroundingSources(parsed.data, input.safetyContext);
  } catch (error) {
    if (error instanceof RiskInterpretationError) {
      throw error;
    }
    logInterpreterFailure("INTERPRETER_GROUNDING_VALIDATION", error);
    throw new RiskInterpretationError("INTERPRETER_GROUNDING_VALIDATION");
  }

  return parsed.data;
}

/**
 * Public application-facing interpreter entry.
 * Validates provider output with the runtime schema; fails closed on any error.
 */
export async function interpretRiskChange(
  input: RiskInterpretationInput,
  provider: RiskInterpreterProvider,
): Promise<RiskInterpretation> {
  let raw: unknown;
  try {
    raw = await provider.interpret(input);
  } catch (error) {
    logInterpreterFailure("INTERPRETER_PROVIDER", error);
    throw new RiskInterpretationError("INTERPRETER_PROVIDER");
  }

  return validateProviderOutput(raw, input);
}
