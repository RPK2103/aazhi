import { createActiveTripService } from "@/server/risk-intelligence";
import { createGetTripHandler } from "./get-trip-handler";

export const runtime = "nodejs";

export const GET = createGetTripHandler(createActiveTripService());
