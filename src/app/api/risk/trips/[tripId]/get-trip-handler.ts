import { NextResponse } from "next/server";
import {
  ActiveTripService,
  tripIdParamSchema,
} from "@/application/active-trip";

export function createGetTripHandler(service: ActiveTripService) {
  return async function GET(
    _request: Request,
    context: { params: Promise<{ tripId: string }> },
  ) {
    try {
      const params = tripIdParamSchema.parse(await context.params);
      const activeTrip = await service.getActiveTrip(params.tripId);

      if (!activeTrip) {
        return NextResponse.json(
          { error: "TRIP_NOT_FOUND", message: "Active trip was not found." },
          { status: 404 },
        );
      }

      return NextResponse.json(activeTrip);
    } catch {
      return NextResponse.json(
        { error: "TRIP_READ_FAILED", message: "Active trip could not be loaded." },
        { status: 400 },
      );
    }
  };
}
