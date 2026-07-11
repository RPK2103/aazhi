import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/marine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marine")>();
  return { ...actual, fetchMarineContext: vi.fn() };
});

vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...actual, generateAssessment: vi.fn() };
});

import { POST } from "@/app/api/assess/route";
import {
  AssessmentGenerationError,
  generateAssessment,
} from "@/lib/gemini";
import {
  fetchMarineContext,
  MarineContextError,
} from "@/lib/marine";
import type { AazhiAssessment, MarineContext } from "@/lib/types";
import { MAX_IMAGE_BYTES } from "@/lib/validation";

const marineContext: MarineContext = {
  waveHeight: 0.7,
  wavePeriod: 8,
  windWaveHeight: 0.2,
  swellWaveHeight: 0.5,
  checkedAt: "2026-07-11T08:00:00.000Z",
  source: "Open-Meteo Marine Forecast",
};

const assessment: AazhiAssessment = {
  actionPosture: "DELAY AND REASSESS",
  urgency: "HIGH",
  situationSummary: "Resolve vessel readiness concerns before departure.",
  conditionConflict: {
    detected: true,
    explanation: "Reported local conditions add concern beyond the forecast.",
  },
  departureBlockers: [
    {
      title: "Engine reliability",
      reason: "The recent engine issue remains unresolved.",
      priority: "HIGH",
    },
  ],
  whyThisMatters: "Mechanical and communication gaps increase trip exposure.",
  immediateActions: ["Inspect and test the engine."],
  preDepartureChecklist: ["Restore backup communication."],
  atSeaActions: ["Monitor conditions continuously."],
  afterReturnActions: ["Record any recurring engine issue."],
  marineContextExplanation: "Marine readings are one part of the assessment.",
  language: "English",
};

const fetchMarineContextMock = vi.mocked(fetchMarineContext);
const generateAssessmentMock = vi.mocked(generateAssessment);

function validForm(overrides: Record<string, string> = {}) {
  const values = {
    location: "chennai-kasimedu",
    boatType: "Small fibre boat",
    crewCount: "5",
    tripDuration: "8",
    language: "English",
    typedObservation: "The sea looks rougher and the engine needs checking.",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

function requestFor(formData: FormData) {
  return new Request("http://localhost/api/assess", {
    method: "POST",
    body: formData,
  });
}

async function responseBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/assess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMarineContextMock.mockResolvedValue(marineContext);
    generateAssessmentMock.mockResolvedValue(assessment);
  });

  it("returns a safe error for malformed multipart input", async () => {
    const request = new Request("http://localhost/api/assess", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not-a-valid-multipart-body",
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({
      error: "The assessment could not be completed.",
    });
  });

  it("requires typed observation or audio", async () => {
    const response = await POST(
      requestFor(validForm({ typedObservation: "   " })),
    );

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      error: "Add a typed or spoken field observation.",
    });
    expect(fetchMarineContextMock).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid location", { location: "unsupported-location" }],
    ["invalid boat type", { boatType: "Cargo ship" }],
    ["invalid crew count", { crewCount: "0" }],
    ["invalid trip duration", { tripDuration: "0" }],
  ])("rejects %s", async (_label, override) => {
    const response = await POST(requestFor(validForm(override)));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      error: "Check the form fields and try again.",
    });
    expect(fetchMarineContextMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported image MIME type", async () => {
    const formData = validForm();
    formData.set(
      "image",
      new File(["gif"], "sea.gif", { type: "image/gif" }),
    );

    const response = await POST(requestFor(formData));

    expect(response.status).toBe(415);
    expect(await responseBody(response)).toEqual({
      error: "Unsupported image file type.",
    });
  });

  it("rejects an oversized image", async () => {
    const formData = validForm();
    formData.set(
      "image",
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "sea.jpg", {
        type: "image/jpeg",
      }),
    );

    const response = await POST(requestFor(formData));

    expect(response.status).toBe(413);
    expect(await responseBody(response)).toEqual({
      error: "Image file is too large.",
    });
  });

  it("returns a structured assessment for valid text-only input", async () => {
    const response = await POST(requestFor(validForm()));
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ assessment, marineContext });
    expect(fetchMarineContextMock).toHaveBeenCalledOnce();
    expect(generateAssessmentMock).toHaveBeenCalledOnce();
    expect(generateAssessmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locationName: "Chennai / Kasimedu",
        audio: undefined,
        image: undefined,
      }),
    );
  });

  it("passes validated optional image metadata and bytes to Gemini", async () => {
    const formData = validForm();
    formData.set(
      "image",
      new File(["image-bytes"], "sea.png", { type: "image/png" }),
    );

    const response = await POST(requestFor(formData));

    expect(response.status).toBe(200);
    expect(generateAssessmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        image: {
          data: Buffer.from("image-bytes").toString("base64"),
          mimeType: "image/png",
        },
      }),
    );
  });

  it("returns 503 when the marine provider fails", async () => {
    fetchMarineContextMock.mockRejectedValueOnce(new MarineContextError());

    const response = await POST(requestFor(validForm()));

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({
      error: "Live marine context is temporarily unavailable.",
    });
    expect(generateAssessmentMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the Gemini provider fails", async () => {
    generateAssessmentMock.mockRejectedValueOnce(
      new AssessmentGenerationError(),
    );

    const response = await POST(requestFor(validForm()));

    expect(response.status).toBe(502);
    expect(await responseBody(response)).toEqual({
      error: "The readiness brief could not be generated. Please try again.",
    });
  });

  it("returns 502 when Gemini structured output is malformed", async () => {
    generateAssessmentMock.mockRejectedValueOnce(
      new AssessmentGenerationError(),
    );

    const response = await POST(requestFor(validForm()));

    expect(response.status).toBe(502);
    expect(await responseBody(response)).toEqual({
      error: "The readiness brief could not be generated. Please try again.",
    });
  });
});
