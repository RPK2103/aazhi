import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AazhiAssessment, MarineContext } from "@/lib/types";

const { generateContentMock, googleGenAIMock } = vi.hoisted(() => {
  const generateContent = vi.fn();
  return {
    generateContentMock: generateContent,
    googleGenAIMock: vi.fn(function GoogleGenAI() {
      return { models: { generateContent } };
    }),
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: googleGenAIMock,
}));

import {
  AssessmentGenerationError,
  parseAssessmentResponse,
} from "@/lib/gemini-parse";
import { GEMINI_MODEL, generateAssessment } from "@/lib/generate-assessment";

const originalApiKey = process.env.GEMINI_API_KEY;

const marineContext: MarineContext = {
  waveHeight: 0.7,
  wavePeriod: 8,
  windWaveHeight: 0.2,
  swellWaveHeight: 0.5,
  checkedAt: "2026-07-11T08:00:00.000Z",
  source: "Open-Meteo Marine Forecast",
};

function validAssessment(
  overrides: Partial<AazhiAssessment> = {},
): AazhiAssessment {
  return {
    actionPosture: "DELAY AND REASSESS",
    urgency: "HIGH",
    situationSummary: "Resolve readiness concerns before departure.",
    conditionConflict: {
      detected: true,
      explanation: "The local report adds concern beyond the forecast.",
    },
    departureBlockers: [
      {
        title: "Engine reliability",
        reason: "The recent issue remains unresolved.",
        priority: "HIGH",
      },
    ],
    whyThisMatters: "Combined concerns increase exposure.",
    immediateActions: ["Inspect the engine."],
    preDepartureChecklist: ["Test communication equipment."],
    atSeaActions: ["Monitor conditions."],
    afterReturnActions: ["Record recurring issues."],
    marineContextExplanation: "Forecast data is one evidence layer.",
    language: "English",
    ...overrides,
  };
}

function generationInput() {
  return {
    locationName: "Chennai / Kasimedu",
    boatType: "Small fibre boat",
    crewCount: 5,
    tripDuration: 8,
    language: "English" as const,
    typedObservation: "The sea looks rougher and the engine needs checking.",
    marineContext,
  };
}

describe("parseAssessmentResponse", () => {
  it("parses a valid structured assessment", () => {
    const assessment = validAssessment();
    expect(parseAssessmentResponse(JSON.stringify(assessment))).toEqual({
      success: true,
      data: assessment,
    });
  });

  it("rejects missing required fields", () => {
    const result = parseAssessmentResponse(
      JSON.stringify({ actionPosture: "DELAY AND REASSESS" }),
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.stage).toBe("GEMINI_ZOD_VALIDATION");
  });

  it("rejects an invalid action posture", () => {
    const result = parseAssessmentResponse(
      JSON.stringify(validAssessment({ actionPosture: "RETURN" as never })),
    );

    expect(result.success).toBe(false);
    if (!result.success && result.stage === "GEMINI_ZOD_VALIDATION") {
      expect(result.issues.some((issue) => issue.path === "actionPosture")).toBe(
        true,
      );
    }
  });

  it("rejects an invalid urgency", () => {
    const result = parseAssessmentResponse(
      JSON.stringify(validAssessment({ urgency: "SEVERE" as never })),
    );

    expect(result.success).toBe(false);
    if (!result.success && result.stage === "GEMINI_ZOD_VALIDATION") {
      expect(result.issues.some((issue) => issue.path === "urgency")).toBe(true);
    }
  });

  it("classifies malformed JSON as a parse failure", () => {
    const result = parseAssessmentResponse('{"actionPosture":');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.stage).toBe("GEMINI_PARSE");
  });

  it("allows an empty blocker array", () => {
    const assessment = validAssessment({ departureBlockers: [] });
    const result = parseAssessmentResponse(JSON.stringify(assessment));

    expect(result).toEqual({ success: true, data: assessment });
  });

  it("preserves Tamil and Unicode guidance", () => {
    const assessment = validAssessment({
      situationSummary: "புறப்படுவதற்கு முன் இயந்திரத்தைச் சரிபார்க்கவும்.",
      departureBlockers: [
        {
          title: "இயந்திர நம்பகத்தன்மை",
          reason: "சமீபத்திய கோளாறு இன்னும் தீர்க்கப்படவில்லை.",
          priority: "HIGH",
        },
      ],
      language: "Tamil",
    });
    const result = parseAssessmentResponse(JSON.stringify(assessment));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.situationSummary).toBe(
        "புறப்படுவதற்கு முன் இயந்திரத்தைச் சரிபார்க்கவும்.",
      );
      expect(result.data.departureBlockers[0].title).toBe(
        "இயந்திர நம்பகத்தன்மை",
      );
    }
  });
});

describe("generateAssessment provider boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("makes one structured request and validates its response", async () => {
    const assessment = validAssessment();
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(assessment),
    });

    await expect(generateAssessment(generationInput())).resolves.toEqual(
      assessment,
    );

    expect(googleGenAIMock).toHaveBeenCalledWith({ apiKey: "test-api-key" });
    expect(generateContentMock).toHaveBeenCalledOnce();
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: GEMINI_MODEL,
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
          systemInstruction: expect.any(String),
        }),
      }),
    );
  });

  it("includes optional audio and image as inline data", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(validAssessment()),
    });

    await generateAssessment({
      ...generationInput(),
      audio: { data: "audio-base64", mimeType: "audio/webm" },
      image: { data: "image-base64", mimeType: "image/png" },
    });

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          expect.objectContaining({
            parts: expect.arrayContaining([
              {
                inlineData: {
                  data: "audio-base64",
                  mimeType: "audio/webm",
                },
              },
              {
                inlineData: {
                  data: "image-base64",
                  mimeType: "image/png",
                },
              },
            ]),
          }),
        ],
      }),
    );
  });

  it("fails safely when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(generateAssessment(generationInput())).rejects.toBeInstanceOf(
      AssessmentGenerationError,
    );
    expect(generateContentMock).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("maps provider failures to a safe assessment error", async () => {
    generateContentMock.mockRejectedValueOnce(new Error("provider unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(generateAssessment(generationInput())).rejects.toBeInstanceOf(
      AssessmentGenerationError,
    );

    consoleError.mockRestore();
  });

  it("rejects malformed provider JSON", async () => {
    generateContentMock.mockResolvedValueOnce({ text: "not-json" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(generateAssessment(generationInput())).rejects.toBeInstanceOf(
      AssessmentGenerationError,
    );

    consoleError.mockRestore();
  });

  it("rejects provider JSON that violates the assessment schema", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ urgency: "HIGH" }),
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(generateAssessment(generationInput())).rejects.toBeInstanceOf(
      AssessmentGenerationError,
    );

    consoleError.mockRestore();
  });
});
