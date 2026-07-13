import { createActiveTripService } from "@/server/risk-intelligence";
import { createRefreshMarineHandler } from "./refresh-marine-handler";

export const runtime = "nodejs";

export const POST = createRefreshMarineHandler(createActiveTripService());
