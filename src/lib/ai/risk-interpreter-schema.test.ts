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
    groundingSources: [] as const,
  };
}

describe("riskInterpretationSchema", () => {
  it("valid structure passes schema validation", () => {
    const result = riskInterpretationSchema.safeParse(validInterpretation());
    expect(result.success).toBe(true);
  });

  it("requires groundingSources field", () => {
    const { groundingSources: _groundingSources, ...withoutGrounding } =
      validInterpretation();
    void _groundingSources;
    const result = riskInterpretationSchema.safeParse(withoutGrounding);
    expect(result.success).toBe(false);
  });

  it("accepts empty groundingSources array", () => {
    const result = riskInterpretationSchema.safeParse(validInterpretation());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groundingSources).toEqual([]);
    }
  });

  it("rejects unknown output fields", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      materialChange: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects action field", () => {
    const result = riskInterpretationSchema.safeParse({
      ...validInterpretation(),
      action: "RETURN_TO_SHORE",
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
});

describe("parseRiskInterpretationResponse", () => {
  it("parses valid JSON with groundingSources", () => {
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
