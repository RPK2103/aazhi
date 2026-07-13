import { createCoordinatorAttentionHandler } from "./coordinator-attention-handler";
import { createCoordinatorAttentionService } from "@/server/risk-intelligence";

export const GET = createCoordinatorAttentionHandler(
  createCoordinatorAttentionService(),
);
