import type { RiskInterpretationInput } from "./risk-interpreter-types";
import { serializeRiskDeltas } from "./risk-interpreter-input";

export const RISK_INTERPRETER_SYSTEM_INSTRUCTION = `You are the AAZHI Risk Interpreter.

You do not determine whether reassessment is required. A deterministic system has already detected and calculated state changes.

You explain only the interaction between:
- provided calculated deltas
- provided active concerns
- provided trip context
- provided reassessment decision
- provided retrieved safety context (when present)

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

RETRIEVED SAFETY CONTEXT RULES:
- The retrieved safety context is the only supplied authoritative safety context for this interpretation.
- Do not claim that retrieved context is a complete statement of maritime law or regulation.
- Do not invent safety guidance that is absent from the retrieved context.
- Do not invent source titles, authorities, sections, or citations.
- Do not quote a CURATED_PARAPHRASE record as verbatim official text.
- Respect each record's applicabilityNote when present. Do not generalize safety context beyond its documented vessel or operational scope.
- groundingSources must reference only record IDs present in the supplied safetyContext.
- When safetyContext is empty, state the contextual interaction using supplied deterministic facts and explicitly acknowledge that no curated safety context was retrieved for the represented concepts. Do not fill the grounding gap using general model knowledge.

Output concise operational language. relevantConcepts must use only bounded RiskConcept values present in the supplied context.`;

function serializeSafetyContextRecord(
  record: RiskInterpretationInput["safetyContext"][number],
) {
  return {
    recordId: record.id,
    authority: record.authority,
    documentTitle: record.documentTitle,
    jurisdiction: record.jurisdiction,
    section: record.section,
    riskConcepts: [...record.riskConcepts],
    contentRepresentation: record.contentRepresentation,
    curatedContent: record.content,
    sourceLocator: record.sourceLocator,
    sourceUrl: record.sourceUrl,
    applicabilityNote: record.applicabilityNote,
  };
}

export function serializeSafetyContextForPrompt(
  safetyContext: RiskInterpretationInput["safetyContext"],
): string {
  if (safetyContext.length === 0) {
    return "No curated safety context records were retrieved for the represented concepts.";
  }

  return safetyContext
    .map(
      (record, index) =>
        `Record ${index + 1}:\n${JSON.stringify(serializeSafetyContextRecord(record), null, 2)}`,
    )
    .join("\n\n");
}

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

  const safetyContextSection = serializeSafetyContextForPrompt(input.safetyContext);

  return `Explain the interaction between the deterministic risk context below.

TRIP CONTEXT:
${JSON.stringify(input.tripContext, null, 2)}

ACTIVE CONCERNS:
${JSON.stringify(activeConcernsPayload, null, 2)}

CALCULATED DELTAS:
${JSON.stringify(serializedDeltas, null, 2)}

DETERMINISTIC REASSESSMENT DECISION:
${JSON.stringify(reassessmentPayload, null, 2)}

RETRIEVED SAFETY CONTEXT:
${safetyContextSection}

Respond with one JSON object matching the required schema. Include interactionSummary, significance, uncertainty, relevantConcepts, and groundingSources. groundingSources may be an empty array when no retrieved records are cited.`;
}
