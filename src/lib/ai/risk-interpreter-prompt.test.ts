import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
} from "@/domain/risk";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import { S003_ENGINE_WAVE_DETERIORATION } from "@/evals";
import { buildRiskState, STABLE_MARINE } from "@/evals/fixtures/risk-state-factory";
import { buildRiskInterpretationInput } from "./risk-interpreter-input";
import {
  buildRiskInterpreterPrompt,
  RISK_INTERPRETER_SYSTEM_INSTRUCTION,
  serializeSafetyContextForPrompt,
} from "./risk-interpreter-prompt";

describe("buildRiskInterpreterPrompt", () => {
  it("states grounding rules in system instruction", () => {
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "RETRIEVED SAFETY CONTEXT RULES:",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "Do not quote a CURATED_PARAPHRASE record as verbatim official text.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "Respect each record's applicabilityNote when present.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "Do not generalize safety context beyond its documented vessel or operational scope.",
    );
    expect(RISK_INTERPRETER_SYSTEM_INSTRUCTION).toContain(
      "no curated safety context was retrieved",
    );
  });

  it("separates trip context, concerns, deltas, reassessment, and safety context", () => {
    const input = buildRiskInterpretationInput(
      buildRiskState({
        marineState: STABLE_MARINE,
        activeConcerns: [],
        lastEvaluatedAt: "2026-07-12T07:00:00.000Z",
        version: 1,
      }),
      [],
      {
        required: false,
        reason: "NO_MATERIAL_CHANGE",
        triggerConcepts: [],
      },
      [],
    );

    const prompt = buildRiskInterpreterPrompt(input);
    expect(prompt).toContain("TRIP CONTEXT:");
    expect(prompt).toContain("ACTIVE CONCERNS:");
    expect(prompt).toContain("CALCULATED DELTAS:");
    expect(prompt).toContain("DETERMINISTIC REASSESSMENT DECISION:");
    expect(prompt).toContain("RETRIEVED SAFETY CONTEXT:");
  });

  it("includes provenance metadata for retrieved records", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const decision = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const input = buildRiskInterpretationInput(
      S003_ENGINE_WAVE_DETERIORATION.currentState,
      deltas,
      decision,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    const prompt = buildRiskInterpreterPrompt(input);

    expect(input.safetyContext.length).toBeGreaterThan(0);
    expect(prompt).toContain("recordId");
    expect(prompt).toContain("contentRepresentation");
    expect(prompt).toContain("curatedContent");
    expect(prompt).toContain("sourceLocator");
    expect(prompt).toContain("applicabilityNote");
  });

  it("serializes applicabilityNote into the Risk Interpreter prompt", () => {
    const deltas = calculateRiskDeltas(
      S003_ENGINE_WAVE_DETERIORATION.previousState,
      S003_ENGINE_WAVE_DETERIORATION.currentState,
    );
    const decision = evaluateReassessmentNeed(
      deltas,
      S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
    );
    const input = buildRiskInterpretationInput(
      S003_ENGINE_WAVE_DETERIORATION.currentState,
      deltas,
      decision,
      INITIAL_SAFETY_KNOWLEDGE,
    );
    const prompt = buildRiskInterpreterPrompt(input);
    const waveRecord = input.safetyContext.find(
      (record) => record.id === "sk-incois-wave-context-001",
    );
    expect(waveRecord?.applicabilityNote).toBeTruthy();
    expect(prompt).toContain(waveRecord!.applicabilityNote!);
  });

  it("represents empty safety context explicitly", () => {
    expect(serializeSafetyContextForPrompt([])).toContain(
      "No curated safety context records were retrieved",
    );
  });
});
