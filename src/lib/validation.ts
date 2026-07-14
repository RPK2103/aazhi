import { z } from "zod";
import {
  ACTION_POSTURES,
  BOAT_TYPES,
  LANGUAGES,
  PRIORITY_LEVELS,
  URGENCY_LEVELS,
} from "@/lib/types";
import { COASTAL_LOCATIONS } from "@/lib/locations";

const guidance = z.string().trim().min(1).max(800);
const shortGuidance = z.string().trim().min(1).max(240);

export const aazhiAssessmentSchema = z
  .object({
    actionPosture: z.enum(ACTION_POSTURES),
    urgency: z.enum(URGENCY_LEVELS),
    situationSummary: guidance,
    conditionConflict: z.object({
      detected: z.boolean(),
      explanation: guidance,
    }),
    departureBlockers: z
      .array(
        z.object({
          title: shortGuidance,
          reason: guidance,
          priority: z.enum(PRIORITY_LEVELS),
        }),
      )
      .max(6),
    whyThisMatters: guidance,
    immediateActions: z.array(shortGuidance).max(3),
    preDepartureChecklist: z.array(shortGuidance).max(5),
    atSeaActions: z.array(shortGuidance).max(3),
    afterReturnActions: z.array(shortGuidance).max(3),
    marineContextExplanation: guidance,
    language: z.enum(LANGUAGES),
  })
  .strict();

const locationIds = COASTAL_LOCATIONS.map((location) => location.id) as [
  string,
  ...string[],
];

export const assessmentInputSchema = z.object({
  location: z.enum(locationIds),
  boatType: z.enum(BOAT_TYPES),
  crewCount: z.coerce.number().int().min(1).max(30),
  tripDuration: z.coerce.number().positive().max(72),
  language: z.enum(LANGUAGES),
  typedObservation: z.string().trim().max(1500).default(""),
});

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Maximum total multipart body before parsing when Content-Length is present. */
export const MAX_ASSESSMENT_MULTIPART_BYTES =
  MAX_IMAGE_BYTES + MAX_AUDIO_BYTES + 64 * 1024;

export const ASSESSMENT_FORM_SCALAR_KEYS = [
  "location",
  "boatType",
  "crewCount",
  "tripDuration",
  "language",
  "typedObservation",
] as const;

export const ASSESSMENT_FORM_FILE_KEYS = ["image", "audio"] as const;

export const ASSESSMENT_FORM_ALLOWED_KEYS = [
  ...ASSESSMENT_FORM_SCALAR_KEYS,
  ...ASSESSMENT_FORM_FILE_KEYS,
] as const;

export type AssessmentFormScalarKey =
  (typeof ASSESSMENT_FORM_SCALAR_KEYS)[number];
export type AssessmentFormFileKey = (typeof ASSESSMENT_FORM_FILE_KEYS)[number];

const SCALAR_KEYS_SET = new Set<string>(ASSESSMENT_FORM_SCALAR_KEYS);
const FILE_KEYS_SET = new Set<string>(ASSESSMENT_FORM_FILE_KEYS);
const ALLOWED_KEYS_SET = new Set<string>(ASSESSMENT_FORM_ALLOWED_KEYS);

export type AssessmentFormValidationResult =
  | {
      valid: true;
      scalars: Record<AssessmentFormScalarKey, FormDataEntryValue | null>;
      files: Record<AssessmentFormFileKey, FormDataEntryValue | null>;
    }
  | { valid: false; reason: "unknown-key" | "duplicate-field" };

export function validateAssessmentFormData(formData: FormData): AssessmentFormValidationResult {
  const scalars = {} as Record<
    AssessmentFormScalarKey,
    FormDataEntryValue | null
  >;
  for (const key of ASSESSMENT_FORM_SCALAR_KEYS) {
    scalars[key] = null;
  }

  const files = {} as Record<AssessmentFormFileKey, FormDataEntryValue | null>;
  for (const key of ASSESSMENT_FORM_FILE_KEYS) {
    files[key] = null;
  }

  for (const key of formData.keys()) {
    if (!ALLOWED_KEYS_SET.has(key)) {
      return { valid: false, reason: "unknown-key" };
    }

    const values = formData.getAll(key);
    if (values.length > 1) {
      return { valid: false, reason: "duplicate-field" };
    }

    const value = values[0] ?? null;
    if (SCALAR_KEYS_SET.has(key)) {
      scalars[key as AssessmentFormScalarKey] = value;
    } else if (FILE_KEYS_SET.has(key)) {
      files[key as AssessmentFormFileKey] = value;
    }
  }

  return { valid: true, scalars, files };
}

export function parseContentLengthHeader(
  contentLength: string | null,
): number | null {
  if (!contentLength) return null;
  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export type UploadKind = "audio" | "image";

export function normalizeMimeType(mimeType: string) {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function validateUploadMetadata(
  kind: UploadKind,
  mimeType: string,
  size: number,
):
  | { valid: true; mimeType: string }
  | { valid: false; reason: "unsupported-type" | "too-large" } {
  const normalizedMime = normalizeMimeType(mimeType);
  const allowedTypes = kind === "audio" ? AUDIO_MIME_TYPES : IMAGE_MIME_TYPES;
  const maxBytes = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;

  if (!allowedTypes.some((allowed) => allowed === normalizedMime)) {
    return { valid: false, reason: "unsupported-type" };
  }
  if (size > maxBytes) {
    return { valid: false, reason: "too-large" };
  }
  return { valid: true, mimeType: normalizedMime };
}

export function hasFieldObservation({
  typedObservation,
  hasAudio,
}: {
  typedObservation: string;
  hasAudio: boolean;
}) {
  return typedObservation.trim().length > 0 || hasAudio;
}
