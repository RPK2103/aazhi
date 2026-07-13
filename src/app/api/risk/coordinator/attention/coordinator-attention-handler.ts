import { NextResponse } from "next/server";
import {
  CoordinatorAttentionIncompleteStateError,
  CoordinatorAttentionService,
} from "@/application/coordinator-attention";
import { MalformedProcessingTimelinePayloadError } from "@/application/risk-orchestrator";

export function createCoordinatorAttentionHandler(
  service: CoordinatorAttentionService,
) {
  return async function GET() {
    try {
      const attention = await service.getCoordinatorAttention();
      return NextResponse.json(attention);
    } catch (error) {
      if (error instanceof MalformedProcessingTimelinePayloadError) {
        return NextResponse.json(
          {
            error: "TIMELINE_VALIDATION_FAILED",
            message:
              "Recorded trip timeline could not be validated for coordinator attention projection.",
          },
          { status: 400 },
        );
      }

      if (error instanceof CoordinatorAttentionIncompleteStateError) {
        return NextResponse.json(
          {
            error: "INCOMPLETE_TRIP_STATE",
            message:
              "An active trip is missing recorded risk state required for coordinator attention projection.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: "COORDINATOR_ATTENTION_FAILED",
          message: "Coordinator attention projection could not be loaded.",
        },
        { status: 500 },
      );
    }
  };
}
