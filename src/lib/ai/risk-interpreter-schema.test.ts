import { describe, expect, it } from "vitest";
import { RISK_CONCEPTS } from "@/domain/risk";
import {
  parseRiskInterpretationResponse,
  riskInterpretationSchema,
} from "./risk-interpreter-schema";

function validInterpretation() {
  return {
    interactionSummary:
      "Wave conditions changed while an engine concern remains unresolved.",
    significance:
      "The unresolved propulsion concern may become more operationally relevant.",
    uncertainty:
      "AAZHI cannot verify the mechanical condition of the engine.",
    relevantConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"] as const,
  };
}

describe("riskInterpretationSchema", () => {
  it("valid structure passes schema validation", () => {
    const result = riskInterpretationSchema.safeParse(validInterpretation());
    expect(result.success).toBe(true);
  });

  it("missing interactionSummary fails validation", () => {
    const payload = validInterpretation();
    const rest = {
      significance: payload.significance,
      uncertainty: payload.uncertainty,
      relevantConcepts: payload.relevantConcepts,
    };
    const result = riskInterpretationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("empty significance fails validation", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      significance: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("empty uncertainty fails validation", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      uncertainty: "",
    });
    expect(result.success).toBe(false);
  });

  it("unsupported relevant concept fails validation", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      relevantConcepts: ["ENGINE_FAILURE"],
    });
    expect(result.success).toBe(false);
  });

  it("valid bounded relevant concepts pass", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      relevantConcepts: [...RISK_CONCEPTS],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown output fields", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      materialChange: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseRiskInterpretationResponse", () => {
  it("parses valid JSON", () => {
    const payload = validInterpretation();
    const result = parseRiskInterpretationResponse(JSON.stringify(payload));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(payload);
    }
  });

  it("fails closed on malformed JSON", () => {
    const result = parseRiskInterpretationResponse("{not-json");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe("INTERPRETER_PARSE");
    }
  });
});
