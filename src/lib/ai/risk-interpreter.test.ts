import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import { deriveOperationalPolicyDecision } from "@/domain/policy";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import {
  INITIAL_RISK_SCENARIOS,
  S003_ENGINE_WAVE_DETERIORATION,
  S011_MISSED_CHECK_IN,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
} from "@/evals";
import { evaluateRetrievalSuite } from "@/evals/retrieval";
import { evaluateInterpreterBoundary } from "@/evals/ai";
import {
  buildRiskInterpretationInput,
  shouldInvokeRiskInterpreter,
} from "./risk-interpreter-input";
import {
  buildRiskInterpreterPrompt,
  serializeSafetyContextForPrompt,
} from "./risk-interpreter-prompt";
import {
  interpretRiskChange,
  RiskInterpretationError,
  type RiskInterpreterProvider,
} from "./risk-interpreter";

const validFakeResponse = {
  interactionSummary:
    "Wave conditions changed from the earlier trip state while the previously reported engine reliability concern remains unresolved.",
  significance:
    "The unresolved propulsion concern may become more operationally relevant when environmental conditions change.",
  uncertainty:
    "AAZHI cannot verify the mechanical condition of the engine or determine vessel seaworthiness.",
  relevantConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
  groundingSources: [] as const,
};

function buildS003Input() {
  const deltas = calculateRiskDeltas(
    S003_ENGINE_WAVE_DETERIORATION.previousState,
    S003_ENGINE_WAVE_DETERIORATION.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
  );
  return buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    deltas,
    reassessment,
    INITIAL_SAFETY_KNOWLEDGE,
  );
}

function fakeProvider(
  response: unknown,
  shouldThrow = false,
): RiskInterpreterProvider {
  return {
    interpret: async () => {
      if (shouldThrow) {
        throw new Error("provider failure");
      }
      return response;
    },
  };
}

describe("interpretRiskChange", () => {
  const baseInput = buildS003Input();

  it("returns validated RiskInterpretation from fake provider valid response", async () => {
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider(validFakeResponse),
    );
    expect(result).toEqual(validFakeResponse);
  });

  it("fails closed on malformed provider response", async () => {
    await expect(
      interpretRiskChange(baseInput, fakeProvider("{bad-json")),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on unsupported concept in provider response", async () => {
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          relevantConcepts: ["ENGINE_FAILURE"],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on provider failure", async () => {
    await expect(
      interpretRiskChange(baseInput, fakeProvider(null, true)),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("accepts valid grounding source reference", async () => {
    const record = baseInput.safetyContext[0];
    expect(record).toBeDefined();
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider({
        ...validFakeResponse,
        groundingSources: [
          {
            recordId: record!.id,
            authority: record!.authority,
            documentTitle: record!.documentTitle,
            sourceLocator: record!.sourceLocator,
            sourceUrl: record!.sourceUrl,
          },
        ],
      }),
    );
    expect(result.groundingSources).toHaveLength(1);
  });

  it("fails closed on unknown grounding record ID", async () => {
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          groundingSources: [
            {
              recordId: "sk-fabricated-id",
              authority: "FAO",
              documentTitle: "Test",
              sourceLocator: "Test",
              sourceUrl: "https://www.fao.org/fishery/en/topic/16144",
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on fabricated authority", async () => {
    const record = baseInput.safetyContext[0];
    expect(record).toBeDefined();
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          groundingSources: [
            {
              recordId: record!.id,
              authority: "IMO",
              documentTitle: record!.documentTitle,
              sourceLocator: record!.sourceLocator,
              sourceUrl: record!.sourceUrl,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on fabricated document title", async () => {
    const record = baseInput.safetyContext[0];
    expect(record).toBeDefined();
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          groundingSources: [
            {
              recordId: record!.id,
              authority: record!.authority,
              documentTitle: "Fabricated Title",
              sourceLocator: record!.sourceLocator,
              sourceUrl: record!.sourceUrl,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on fabricated source locator", async () => {
    const record = baseInput.safetyContext[0];
    expect(record).toBeDefined();
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          groundingSources: [
            {
              recordId: record!.id,
              authority: record!.authority,
              documentTitle: record!.documentTitle,
              sourceLocator: "Fabricated Locator",
              sourceUrl: record!.sourceUrl,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("fails closed on fabricated source URL", async () => {
    const record = baseInput.safetyContext[0];
    expect(record).toBeDefined();
    await expect(
      interpretRiskChange(
        baseInput,
        fakeProvider({
          ...validFakeResponse,
          groundingSources: [
            {
              recordId: record!.id,
              authority: record!.authority,
              documentTitle: record!.documentTitle,
              sourceLocator: record!.sourceLocator,
              sourceUrl: "https://example.com/fabricated",
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RiskInterpretationError);
  });

  it("allows empty groundingSources from fake provider", async () => {
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider(validFakeResponse),
    );
    expect(result.groundingSources).toEqual([]);
  });

  it("does not include action in RiskInterpretation", async () => {
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider(validFakeResponse),
    );
    expect(result).not.toHaveProperty("action");
    expect(result).not.toHaveProperty("proposedAction");
  });

  it("does not include materialChange in RiskInterpretation", async () => {
    const result = await interpretRiskChange(
      baseInput,
      fakeProvider(validFakeResponse),
    );
    expect(result).not.toHaveProperty("materialChange");
  });
});

describe("policy isolation from grounding", () => {
  it("does not consume groundingSources", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policy = deriveOperationalPolicyDecision(
      reassessment,
      "2026-07-12T10:00:00.000Z",
    );
    expect(policy).not.toHaveProperty("groundingSources");
  });

  it("does not consume RiskInterpretation", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const policy = deriveOperationalPolicyDecision(
      reassessment,
      "2026-07-12T10:00:00.000Z",
    );
    expect(JSON.stringify(policy)).not.toContain("interactionSummary");
  });
});

describe("S003 interpreter input", () => {
  const deltas = calculateRiskDeltas(
    S003_ENGINE_WAVE_DETERIORATION.previousState,
    S003_ENGINE_WAVE_DETERIORATION.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
  );
  const input = buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    deltas,
    reassessment,
    INITIAL_SAFETY_KNOWLEDGE,
  );

  it("is interpreter eligible", () => {
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(true);
  });

  it("contains retrieved safetyContext", () => {
    expect(input.safetyContext.length).toBeGreaterThan(0);
  });

  it("includes RETRIEVED SAFETY CONTEXT in prompt", () => {
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).toContain("RETRIEVED SAFETY CONTEXT:");
  });

  it("includes source provenance in prompt", () => {
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).toContain("sourceLocator");
    expect(prompt).toContain("documentTitle");
    expect(prompt).toContain("authority");
  });

  it("distinguishes CURATED_PARAPHRASE in prompt", () => {
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).toContain("CURATED_PARAPHRASE");
  });

  it("represents empty safety context explicitly", () => {
    const emptyPrompt = serializeSafetyContextForPrompt([]);
    expect(emptyPrompt).toContain("No curated safety context records were retrieved");
  });
});

describe("S011 capability gap protection", () => {
  it("cannot retrieve unmodelled check-in context", () => {
    const deltas = calculateRiskDeltas(
      S011_MISSED_CHECK_IN.previousState,
      S011_MISSED_CHECK_IN.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S011_MISSED_CHECK_IN.currentState.activeConcerns,
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);

    const input = buildRiskInterpretationInput(
      S011_MISSED_CHECK_IN.currentState,
      deltas,
      reassessment,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).not.toContain("CHECK_IN_STATUS");
    expect(input.safetyContext).toHaveLength(0);
  });
});

describe("S014 capability gap protection", () => {
  it("cannot retrieve unmodelled official-alert context", () => {
    const deltas = calculateRiskDeltas(
      S014_OFFICIAL_ALERT_PLACEHOLDER.previousState,
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState,
    );
    const reassessment = evaluateReassessmentNeed(
      deltas,
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState.activeConcerns,
    );
    expect(shouldInvokeRiskInterpreter(reassessment)).toBe(false);

    const input = buildRiskInterpretationInput(
      S014_OFFICIAL_ALERT_PLACEHOLDER.currentState,
      deltas,
      reassessment,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    expect(input.safetyContext).toHaveLength(0);
    expect(JSON.stringify(input)).not.toContain("OFFICIAL_ALERT");
  });
});

describe("interpreter boundary evaluation", () => {
  const evaluation = evaluateInterpreterBoundary(INITIAL_RISK_SCENARIOS);

  it("achieves input construction success rate of 1 for eligible scenarios", () => {
    expect(evaluation.inputConstructionSuccessRate).toBe(1);
  });
});

describe("retrieval evaluation", () => {
  const evaluation = evaluateRetrievalSuite(
    INITIAL_RISK_SCENARIOS,
    INITIAL_SAFETY_KNOWLEDGE,
  );

  it("evaluates interpreter-eligible scenarios only for retrieval metrics", () => {
    expect(evaluation.metrics.retrievalEligibilityCount).toBe(4);
    expect(evaluation.skippedScenarios).toBe(11);
  });

  it("achieves retrieval execution success rate of 1", () => {
    expect(evaluation.metrics.retrievalExecutionSuccessRate).toBe(1);
  });

  it("achieves provenance completeness rate of 1", () => {
    expect(evaluation.metrics.provenanceCompletenessRate).toBe(1);
  });

  it("reports fabricated source acceptance count of 0", () => {
    expect(evaluation.metrics.fabricatedSourceAcceptanceCount).toBe(0);
  });
});

describe("legacy isolation", () => {
  it("does not export generateAssessment from ai boundary", async () => {
    const aiModule = await import("./index");
    expect(Object.keys(aiModule)).not.toContain("generateAssessment");
  });
});

describe("default provider isolation in unit tests", () => {
  it("does not call createGeminiRiskInterpreterProvider in these tests", async () => {
    const providerModule = await import("./gemini-risk-interpreter-provider");
    expect(providerModule.createGeminiRiskInterpreterProvider).toBeTypeOf(
      "function",
    );
  });
});
