import "server-only";

import { GoogleGenAI, type Part } from "@google/genai";
import type { MarineContext } from "@/lib/types";
import {
  AssessmentGenerationError,
  parseAssessmentResponse,
} from "@/lib/gemini-parse";

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

type DiagnosticStage =
  | "GEMINI_REQUEST"
  | "GEMINI_PARSE"
  | "GEMINI_ZOD_VALIDATION";

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

function logGeminiFailure(stage: DiagnosticStage, error: unknown) {
  console.error("[AAZHI_ASSESSMENT_FAILURE]", {
    stage,
    ...safeErrorDetails(error),
  });
}

interface AssessmentMedia {
  data: string;
  mimeType: string;
}

interface GenerateAssessmentInput {
  locationName: string;
  boatType: string;
  crewCount: number;
  tripDuration: number;
  language: "English" | "Tamil";
  typedObservation: string;
  marineContext: MarineContext;
  audio?: AssessmentMedia;
  image?: AssessmentMedia;
}

const SYSTEM_INSTRUCTION = `You are the readiness reasoning engine for AAZHI, a pre-departure preparedness assistant for small-scale fishers. Reconcile external marine context with the fisher's reported field observations, visible situational context, vessel readiness, crew context, and planned trip exposure.

Rules:
1. Distinguish external forecast facts from fisher-reported information. Spoken or typed observations are reported field context, not scientifically verified measurements.
2. An image is visible situational context only. Never infer exact wave height, wind speed, capsize probability, or another scientific measurement from it; never claim it scientifically validates marine conditions. When discussing it, explicitly state this boundary.
3. Never invent a forecast value, guarantee safe departure, imitate an official warning, or claim AI-certified vessel safety.
4. Infer assessment-specific blockers from all supplied evidence. Identify unresolved critical vessel reliability or communication issues only when the complete context supports them. For example, longer exposure plus recent mechanical concern, reduced communication redundancy, and changing observed conditions can matter more together than any single reading.
5. A condition conflict exists only when reported or visible local context materially differs from, adds concern beyond, or complicates the external marine context. Do not force one because an image exists.
6. Avoid generic monsoon advice when specific readiness concerns exist. Prioritize no more than three immediate actions. Keep the brief concise, operational, and field-oriented.
7. Encourage following official maritime, weather, and local authority instructions.
8. Generate all descriptive guidance in the requested language. In Tamil mode, genuinely write summaries, explanations, titles, reasons, actions, and checklist text in Tamil. Preserve the exact English enum values required by the JSON schema.

Output style (same JSON schema; shorter plain language only):
- Use short sentences, direct instructions, plain everyday words, one idea per sentence.
- No corporate language, dramatic language, unnecessary jargon, or repeated explanation.
- English: write for a person who needs to understand the decision quickly at the shore. Prefer simple spoken English.
- Tamil: use clear, direct, everyday Tamil. Avoid unnecessarily formal or literary Tamil. Do not transliterate technical English when a simple understandable phrase is possible.
- situationSummary: maximum 2 short sentences; prefer about 25 words or fewer in English-equivalent length.
- departureBlockers.title: 3 to 7 words.
- departureBlockers.reason: one short sentence; prefer about 18 words or fewer in English-equivalent length.
- conditionConflict.explanation: maximum 2 short sentences.
- immediateActions: each item one direct sentence; prefer 8 to 16 words in English-equivalent length.
- marineContextExplanation: maximum 2 short sentences.
- whyThisMatters: maximum 2 short sentences.
- preDepartureChecklist, atSeaActions, afterReturnActions: each item one short action.
- Safety-critical clarity matters more than exact word counts. Do not omit essential safety meaning.`;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "actionPosture",
    "urgency",
    "situationSummary",
    "conditionConflict",
    "departureBlockers",
    "whyThisMatters",
    "immediateActions",
    "preDepartureChecklist",
    "atSeaActions",
    "afterReturnActions",
    "marineContextExplanation",
    "language",
  ],
  properties: {
    actionPosture: {
      type: "string",
      enum: [
        "PREPARE BEFORE DEPARTURE",
        "PROCEED WITH CAUTION",
        "DELAY AND REASSESS",
        "DO NOT DEPART YET",
      ],
    },
    urgency: {
      type: "string",
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
    },
    situationSummary: { type: "string" },
    conditionConflict: {
      type: "object",
      additionalProperties: false,
      required: ["detected", "explanation"],
      properties: {
        detected: { type: "boolean" },
        explanation: { type: "string" },
      },
    },
    departureBlockers: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason", "priority"],
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        },
      },
    },
    whyThisMatters: { type: "string" },
    immediateActions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    preDepartureChecklist: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    atSeaActions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    afterReturnActions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    marineContextExplanation: { type: "string" },
    language: { type: "string", enum: ["English", "Tamil"] },
  },
} as const;

export async function generateAssessment(input: GenerateAssessmentInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logGeminiFailure(
      "GEMINI_REQUEST",
      new Error("GEMINI_API_KEY is not configured."),
    );
    throw new AssessmentGenerationError();
  }

  const factualContext = {
    selectedCoastalLocation: input.locationName,
    boatType: input.boatType,
    crewCount: input.crewCount,
    plannedTripDurationHours: input.tripDuration,
    requestedOutputLanguage: input.language,
    typedFisherObservation: input.typedObservation || null,
    audioObservationAttached: Boolean(input.audio),
    visibleImageAttached: Boolean(input.image),
  };

  const parts: Part[] = [
    {
      text: `Create one prioritized operational pre-departure action brief.

EXTERNAL MARINE CONTEXT — factual readings from Open-Meteo Marine Forecast:
${JSON.stringify(input.marineContext)}

FISHER FIELD CONTEXT — reported/visible context and trip details:
${JSON.stringify(factualContext)}

Trust boundaries: unavailable marine readings are unknown, not zero. Audio is fisher-reported context. Any image is situational context, not a scientific marine measurement. This is preparedness assistance, not official maritime clearance.`,
    },
  ];

  if (input.audio) {
    parts.push({
      inlineData: { data: input.audio.data, mimeType: input.audio.mimeType },
    });
  }
  if (input.image) {
    parts.push({
      inlineData: { data: input.image.data, mimeType: input.image.mimeType },
    });
  }

  let responseText: string;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 3000,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned no response text.");
    }
    responseText = response.text;
  } catch (error) {
    logGeminiFailure("GEMINI_REQUEST", error);
    throw new AssessmentGenerationError();
  }

  const parsed = parseAssessmentResponse(responseText);
  if (!parsed.success && parsed.stage === "GEMINI_PARSE") {
    logGeminiFailure("GEMINI_PARSE", parsed.error);
    throw new AssessmentGenerationError();
  }
  if (!parsed.success) {
    console.error("[AAZHI_ASSESSMENT_FAILURE]", {
      stage: "GEMINI_ZOD_VALIDATION",
      errorName: "ZodError",
      issues: parsed.issues,
      responseKeys: parsed.responseKeys,
    });
    throw new AssessmentGenerationError();
  }

  return parsed.data;
}
