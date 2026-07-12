import { GoogleGenAI } from "@google/genai";
import {
  buildRiskInterpreterPrompt,
  RISK_INTERPRETER_SYSTEM_INSTRUCTION,
} from "./risk-interpreter-prompt";
import { RISK_INTERPRETATION_JSON_SCHEMA } from "./risk-interpreter-schema";
import type { RiskInterpretationInput } from "./risk-interpreter-types";
import type { RiskInterpreterProvider } from "./risk-interpreter";

export const RISK_INTERPRETER_GEMINI_MODEL = "gemini-3.1-flash-lite";

export function createGeminiRiskInterpreterProvider(): RiskInterpreterProvider {
  return {
    async interpret(input: RiskInterpretationInput): Promise<unknown> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: RISK_INTERPRETER_GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: buildRiskInterpreterPrompt(input) }],
          },
        ],
        config: {
          systemInstruction: RISK_INTERPRETER_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: RISK_INTERPRETATION_JSON_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 1500,
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned no response text.");
      }

      return response.text;
    },
  };
}
