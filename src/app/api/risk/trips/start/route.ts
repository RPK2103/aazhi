import { createActiveTripService } from "@/server/risk-intelligence";
import { createStartTripHandler } from "./start-trip-handler";

export const runtime = "nodejs";

export const POST = createStartTripHandler(createActiveTripService());
