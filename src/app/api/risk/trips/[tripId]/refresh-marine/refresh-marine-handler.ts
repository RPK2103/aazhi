import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ActiveTripService,
  ActiveTripNotFoundError,
  tripIdParamSchema,
} from "@/application/active-trip";
import { MarineContextError } from "@/lib/marine";

export function createRefreshMarineHandler(service: ActiveTripService) {
  return async function POST(
    _request: Request,
    context: { params: Promise<{ tripId: string }> },
  ) {
    try {
      const params = tripIdParamSchema.parse(await context.params);
      const result = await service.refreshMarine(params.tripId);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "INVALID_TRIP_ID",
            message: "Trip identifier is invalid.",
          },
          { status: 400 },
        );
      }

      if (error instanceof ActiveTripNotFoundError) {
        return NextResponse.json(
          { error: "TRIP_NOT_FOUND", message: "Active trip was not found." },
          { status: 404 },
        );
      }

      if (error instanceof MarineContextError) {
        return NextResponse.json(
          {
            error: "MARINE_REFRESH_FAILED",
            message:
              "Latest marine context could not be checked. The last recorded trip state is unchanged.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          error: "MARINE_REFRESH_FAILED",
          message:
            "Latest marine context could not be checked. The last recorded trip state is unchanged.",
        },
        { status: 500 },
      );
    }
  };
}
