import { describe, expect, it } from "vitest";
import { PrismaVesselRepository } from "@/infrastructure/persistence/prisma/prisma-vessel-repository";
import { PrismaVesselConcernRepository } from "@/infrastructure/persistence/prisma/prisma-vessel-concern-repository";
import { PrismaTripRepository } from "@/infrastructure/persistence/prisma/prisma-trip-repository";
import { PrismaTripRiskStateRepository } from "@/infrastructure/persistence/prisma/prisma-trip-risk-state-repository";
import { PrismaTimelineEventRepository } from "@/infrastructure/persistence/prisma/prisma-timeline-event-repository";

describe("Prisma repository adapters", () => {
  it("expose repository classes without requiring database calls in unit tests", () => {
    expect(PrismaVesselRepository).toBeDefined();
    expect(PrismaVesselConcernRepository).toBeDefined();
    expect(PrismaTripRepository).toBeDefined();
    expect(PrismaTripRiskStateRepository).toBeDefined();
    expect(PrismaTimelineEventRepository).toBeDefined();
  });
});
