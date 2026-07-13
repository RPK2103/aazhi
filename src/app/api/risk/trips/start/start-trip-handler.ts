import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ActiveTripService,
  InvalidVesselReferenceError,
  UnknownAssessmentPostureError,
  startTripRequestSchema,
} from "@/application/active-trip";
import { MarineContextError } from "@/lib/marine";

export function createStartTripHandler(service: ActiveTripService) {
  return async function POST(request: Request) {
    try {
      const body: unknown = await request.json();
      const input = startTripRequestSchema.parse(body);

      const result = await service.startTrip({
        vesselId: input.vesselId,
        vessel: input.vessel,
        crewCount: input.crewCount,
        plannedDurationHours: input.plannedDurationHours,
        marineReferenceLocation: input.marineReferenceLocation,
        assessmentPosture: input.assessmentPosture,
        confirmedConcern: input.confirmedConcern,
      });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof InvalidVesselReferenceError) {
        return NextResponse.json(
          {
            error: "INVALID_VESSEL_REFERENCE",
            message:
              "The saved vessel reference is no longer valid. It will be cleared so you can record a new vessel.",
          },
          { status: 404 },
        );
      }

      if (error instanceof UnknownAssessmentPostureError) {
        return NextResponse.json(
          { error: "INVALID_ASSESSMENT_POSTURE", message: error.message },
          { status: 400 },
        );
      }

      if (error instanceof MarineContextError) {
        return NextResponse.json(
          {
            error: "MARINE_UNAVAILABLE",
            message: "Trip state could not be recorded. No active trip was created.",
          },
          { status: 503 },
        );
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Invalid trip start request." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: "TRIP_START_FAILED",
          message: "Trip state could not be recorded. No active trip was created.",
        },
        { status: 500 },
      );
    }
  };
}
