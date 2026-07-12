import type { RiskInterpretationInput, RiskInterpretation } from "./risk-interpreter-types";
import { parseRiskInterpretationResponse } from "./risk-interpreter-schema";

export class RiskInterpretationError extends Error {
  constructor() {
    super("The risk interpretation could not be generated.");
    this.name = "RiskInterpretationError";
  }
}

export interface RiskInterpreterProvider {
  interpret(input: RiskInterpretationInput): Promise<unknown>;
}

type DiagnosticStage =
  | "INTERPRETER_PROVIDER"
  | "INTERPRETER_PARSE"
  | "INTERPRETER_ZOD_VALIDATION";

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

function validateProviderOutput(raw: unknown): RiskInterpretation {
  const responseText =
    typeof raw === "string" ? raw : JSON.stringify(raw ?? null);

  const parsed = parseRiskInterpretationResponse(responseText);
  if (!parsed.success && parsed.stage === "INTERPRETER_PARSE") {
    logInterpreterFailure("INTERPRETER_PARSE", parsed.error);
    throw new RiskInterpretationError();
  }
  if (!parsed.success) {
    console.error("[AAZHI_RISK_INTERPRETER_FAILURE]", {
      stage: "INTERPRETER_ZOD_VALIDATION",
      errorName: "ZodError",
      issues: parsed.issues,
      responseKeys: parsed.responseKeys,
    });
    throw new RiskInterpretationError();
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
    throw new RiskInterpretationError();
  }

  return validateProviderOutput(raw);
}
