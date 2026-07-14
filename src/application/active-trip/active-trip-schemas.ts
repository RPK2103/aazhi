import { z } from "zod";
import { ACTION_POSTURES, BOAT_TYPES } from "@/lib/types";
import { validateMarineReferenceLocation } from "@/domain/risk";
import { MANUAL_CARRY_FORWARD_CONCEPTS } from "./manual-concern-concepts";

const marineReferenceLocationSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
    label: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    try {
      validateMarineReferenceLocation(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Invalid marine reference location",
      });
    }
  });

export const startTripRequestSchema = z
  .object({
    vesselId: z.string().min(1).optional(),
    vessel: z
      .object({
        displayName: z.string().min(1),
        registrationReference: z.string().nullable().optional(),
        vesselType: z.enum(BOAT_TYPES),
      })
      .optional(),
    crewCount: z.number().int().min(1).max(30),
    plannedDurationHours: z.number().int().min(1).max(72),
    marineReferenceLocation: marineReferenceLocationSchema,
    assessmentPosture: z.enum(ACTION_POSTURES),
    confirmedConcern: z
      .object({
        concept: z.enum(MANUAL_CARRY_FORWARD_CONCEPTS),
        summary: z.string().trim().min(1).max(1500),
      })
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.vesselId && !value.vessel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "vessel is required when vesselId is absent",
        path: ["vessel"],
      });
    }
  });

export const tripIdParamSchema = z.object({
  tripId: z.string().uuid(),
});

export type StartTripRequestBody = z.infer<typeof startTripRequestSchema>;
