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
