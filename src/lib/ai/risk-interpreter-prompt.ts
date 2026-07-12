import type { RiskInterpretationInput } from "./risk-interpreter-types";
import { serializeRiskDeltas } from "./risk-interpreter-input";

export const RISK_INTERPRETER_SYSTEM_INSTRUCTION = `You are the AAZHI Risk Interpreter.

You do not determine whether reassessment is required. A deterministic system has already detected and calculated state changes.

You explain only the interaction between:
- provided calculated deltas
- provided active concerns
- provided trip context
- provided reassessment decision

You must not:
- calculate new deltas
- invent vessel conditions
- invent weather or marine values
- assume a concern is resolved
- declare the vessel safe or unsafe
- issue maritime clearance
- provide navigational instructions
- predict that an accident will occur

You must surface uncertainty explicitly. Use only supplied facts.

Reassessment sensitivity is not a maritime danger threshold. A reassessment-relevant delta means only that AAZHI's deterministic system decided contextual interpretation should occur. Do not reinterpret configured sensitivity thresholds (for example 0.5 m wave change or 10 km/h wind change) as safety limits.

Output concise operational language. relevantConcepts must use only bounded RiskConcept values present in the supplied context.`;

export function buildRiskInterpreterPrompt(input: RiskInterpretationInput): string {
  const serializedDeltas = serializeRiskDeltas(input.calculatedDeltas);

  const activeConcernsPayload = input.activeConcerns.map((concern) => ({
    id: concern.id,
    concept: concern.concept,
    status: concern.status,
    summary: concern.summary,
    reportedAt: concern.reportedAt,
  }));

  const reassessmentPayload = {
    required: input.reassessmentDecision.required,
    reason: input.reassessmentDecision.reason,
    triggerConcepts: [...input.reassessmentDecision.triggerConcepts],
  };

  return `Explain the interaction between the deterministic risk context below.

TRIP CONTEXT:
${JSON.stringify(input.tripContext, null, 2)}

ACTIVE CONCERNS:
${JSON.stringify(activeConcernsPayload, null, 2)}

CALCULATED DELTAS:
${JSON.stringify(serializedDeltas, null, 2)}

DETERMINISTIC REASSESSMENT DECISION:
${JSON.stringify(reassessmentPayload, null, 2)}

Respond with one JSON object matching the required schema. Do not add fields beyond interactionSummary, significance, uncertainty, and relevantConcepts.`;
}
