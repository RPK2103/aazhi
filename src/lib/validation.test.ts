import { describe, expect, it } from "vitest";
import type { AazhiAssessment } from "@/lib/types";
import {
  aazhiAssessmentSchema,
  assessmentInputSchema,
  hasFieldObservation,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  normalizeMimeType,
  parseContentLengthHeader,
  validateAssessmentFormData,
  validateUploadMetadata,
} from "@/lib/validation";

const scenarioAInput = {
  location: "chennai-kasimedu",
  boatType: "Small fibre boat",
  crewCount: "5",
  tripDuration: "8",
  language: "English",
  typedObservation:
    "The sea near shore looks rougher than this morning. My engine had trouble yesterday and we do not have the second radio today.",
};

function validAssessment(): AazhiAssessment {
  return {
    actionPosture: "DELAY AND REASSESS",
    urgency: "HIGH",
    situationSummary:
      "Reported nearshore change and unresolved readiness concerns need attention.",
    conditionConflict: {
      detected: true,
      explanation:
        "The reported nearshore conditions add concern beyond the forecast alone.",
    },
    departureBlockers: [
      {
        title: "Resolve engine reliability",
        reason: "A recent engine issue remains unresolved before an eight-hour trip.",
        priority: "HIGH",
      },
    ],
    whyThisMatters:
      "Longer exposure can compound mechanical and communication limitations.",
    immediateActions: [
      "Inspect and test the engine.",
      "Restore backup communication.",
      "Recheck local conditions.",
    ],
    preDepartureChecklist: [
      "Confirm fuel and engine checks.",
      "Test communication equipment.",
    ],
    atSeaActions: ["Monitor conditions and shorten the trip if they worsen."],
    afterReturnActions: ["Record and repair any recurring engine issue."],
    marineContextExplanation:
      "Forecast readings are one input and do not replace reported local context.",
    language: "English",
  };
}

describe("assessmentInputSchema", () => {
  it("accepts valid Scenario A scalar input", () => {
    const result = assessmentInputSchema.safeParse(scenarioAInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crewCount).toBe(5);
      expect(result.data.tripDuration).toBe(8);
    }
  });

  it.each([
    ["unsupported location", { location: "unknown-harbour" }],
    ["unsupported boat type", { boatType: "Cargo ship" }],
    ["crew count zero", { crewCount: "0" }],
    ["crew count above maximum", { crewCount: "31" }],
    ["zero trip duration", { tripDuration: "0" }],
    ["trip duration above maximum", { tripDuration: "73" }],
    ["unsupported language", { language: "Hindi" }],
  ])("rejects %s", (_label, change) => {
    expect(
      assessmentInputSchema.safeParse({ ...scenarioAInput, ...change }).success,
    ).toBe(false);
  });

  it("rejects typed observations over 1500 characters", () => {
    expect(
      assessmentInputSchema.safeParse({
        ...scenarioAInput,
        typedObservation: "a".repeat(1501),
      }).success,
    ).toBe(false);
  });

  it("allows an empty typed observation at the scalar layer", () => {
    const result = assessmentInputSchema.safeParse({
      ...scenarioAInput,
      typedObservation: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.typedObservation).toBe("");
  });
});

describe("aazhiAssessmentSchema", () => {
  it("accepts a representative structured assessment", () => {
    expect(aazhiAssessmentSchema.safeParse(validAssessment()).success).toBe(true);
  });

  it.each([
    ["invalid action posture", { actionPosture: "RETURN TO SHORE" }],
    ["invalid urgency", { urgency: "SEVERE" }],
    ["unsupported language", { language: "Malayalam" }],
  ])("rejects %s", (_label, change) => {
    expect(
      aazhiAssessmentSchema.safeParse({
        ...validAssessment(),
        ...change,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid blocker priority", () => {
    const assessment = validAssessment() as unknown as Record<string, unknown>;
    assessment.departureBlockers = [
      { title: "Check engine", reason: "Unresolved issue", priority: "URGENT" },
    ];
    expect(aazhiAssessmentSchema.safeParse(assessment).success).toBe(false);
  });

  it.each([
    ["immediateActions", 4],
    ["preDepartureChecklist", 6],
    ["atSeaActions", 4],
    ["afterReturnActions", 4],
  ])("rejects %s above its maximum", (field, count) => {
    const assessment = validAssessment() as unknown as Record<string, unknown>;
    assessment[field] = Array.from(
      { length: count },
      (_, index) => `Action ${index + 1}`,
    );
    expect(aazhiAssessmentSchema.safeParse(assessment).success).toBe(false);
  });

  it("rejects a malformed condition conflict", () => {
    const assessment = {
      ...validAssessment(),
      conditionConflict: { detected: "yes" },
    };
    expect(aazhiAssessmentSchema.safeParse(assessment).success).toBe(false);
  });
});

describe("upload metadata validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts supported image MIME %s",
    (mimeType) => {
      expect(validateUploadMetadata("image", mimeType, 1024)).toEqual({
        valid: true,
        mimeType,
      });
    },
  );

  it("rejects an unsupported image MIME", () => {
    expect(validateUploadMetadata("image", "image/gif", 1024)).toEqual({
      valid: false,
      reason: "unsupported-type",
    });
  });

  it("rejects an oversized image", () => {
    expect(
      validateUploadMetadata("image", "image/jpeg", MAX_IMAGE_BYTES + 1),
    ).toEqual({ valid: false, reason: "too-large" });
  });

  it.each([
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
  ])("accepts supported audio MIME %s", (mimeType) => {
    expect(validateUploadMetadata("audio", mimeType, 1024)).toEqual({
      valid: true,
      mimeType,
    });
  });

  it("normalizes MIME codec parameters", () => {
    expect(normalizeMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(
      validateUploadMetadata("audio", "audio/webm;codecs=opus", 1024),
    ).toEqual({ valid: true, mimeType: "audio/webm" });
  });

  it("rejects an unsupported audio MIME", () => {
    expect(validateUploadMetadata("audio", "audio/aac", 1024)).toEqual({
      valid: false,
      reason: "unsupported-type",
    });
  });

  it("rejects oversized audio", () => {
    expect(
      validateUploadMetadata("audio", "audio/webm", MAX_AUDIO_BYTES + 1),
    ).toEqual({ valid: false, reason: "too-large" });
  });
});

describe("field observation requirement", () => {
  it("accepts typed observation only", () => {
    expect(
      hasFieldObservation({ typedObservation: "Sea looks rough", hasAudio: false }),
    ).toBe(true);
  });

  it("accepts audio only", () => {
    expect(
      hasFieldObservation({ typedObservation: "", hasAudio: true }),
    ).toBe(true);
  });

  it("accepts both typed observation and audio", () => {
    expect(
      hasFieldObservation({ typedObservation: "Local change", hasAudio: true }),
    ).toBe(true);
  });

  it("rejects when neither typed observation nor audio exists", () => {
    expect(
      hasFieldObservation({ typedObservation: "   ", hasAudio: false }),
    ).toBe(false);
  });

  it("does not allow image presence to replace field observation", () => {
    // Image state is intentionally absent from this production predicate.
    expect(
      hasFieldObservation({ typedObservation: "", hasAudio: false }),
    ).toBe(false);
  });
});

describe("validateAssessmentFormData", () => {
  function validFormData() {
    const formData = new FormData();
    formData.set("location", "chennai-kasimedu");
    formData.set("boatType", "Small fibre boat");
    formData.set("crewCount", "5");
    formData.set("tripDuration", "8");
    formData.set("language", "English");
    formData.set("typedObservation", "Sea looks rough.");
    return formData;
  }

  it("accepts allowed scalar and file keys", () => {
    const formData = validFormData();
    formData.set("image", new File(["x"], "sea.png", { type: "image/png" }));
    expect(validateAssessmentFormData(formData).valid).toBe(true);
  });

  it("rejects unknown keys", () => {
    const formData = validFormData();
    formData.set("policy", "COORDINATOR_REVIEW_REQUIRED");
    expect(validateAssessmentFormData(formData)).toEqual({
      valid: false,
      reason: "unknown-key",
    });
  });

  it("rejects duplicate crewCount", () => {
    const formData = validFormData();
    formData.append("crewCount", "6");
    expect(validateAssessmentFormData(formData)).toEqual({
      valid: false,
      reason: "duplicate-field",
    });
  });

  it("rejects duplicate tripDuration", () => {
    const formData = validFormData();
    formData.append("tripDuration", "10");
    expect(validateAssessmentFormData(formData)).toEqual({
      valid: false,
      reason: "duplicate-field",
    });
  });

  it("rejects multiple image fields", () => {
    const formData = validFormData();
    formData.append("image", new File(["a"], "a.png", { type: "image/png" }));
    formData.append("image", new File(["b"], "b.png", { type: "image/png" }));
    expect(validateAssessmentFormData(formData)).toEqual({
      valid: false,
      reason: "duplicate-field",
    });
  });

  it("rejects multiple audio fields", () => {
    const formData = validFormData();
    formData.append("audio", new File(["a"], "a.webm", { type: "audio/webm" }));
    formData.append("audio", new File(["b"], "b.webm", { type: "audio/webm" }));
    expect(validateAssessmentFormData(formData)).toEqual({
      valid: false,
      reason: "duplicate-field",
    });
  });
});

describe("parseContentLengthHeader", () => {
  it("parses a valid content length", () => {
    expect(parseContentLengthHeader("1024")).toBe(1024);
  });

  it("returns null for missing or invalid content length", () => {
    expect(parseContentLengthHeader(null)).toBeNull();
    expect(parseContentLengthHeader("not-a-number")).toBeNull();
  });
});
