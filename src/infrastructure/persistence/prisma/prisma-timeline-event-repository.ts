import type {
  CreateTimelineEventInput,
  TimelineEventRepository,
} from "@/application/persistence/persistence-ports";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import { mapPersistedTimelineEvent } from "@/infrastructure/persistence/prisma/persistence-mappers";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/prisma-client";

export class PrismaTimelineEventRepository implements TimelineEventRepository {
  async append(input: CreateTimelineEventInput) {
    try {
      const record = await getPrismaClient().timelineEvent.create({
        data: {
          id: input.id,
          tripId: input.tripId,
          type: input.type,
          payload: input.payload as object,
          occurredAt: input.occurredAt,
          createdAt: input.createdAt,
        },
      });
      return mapPersistedTimelineEvent(record);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new PersistenceConflictError(`Timeline event already exists: ${input.id}`);
      }
      throw error;
    }
  }

  async findByTripId(tripId: string) {
    const records = await getPrismaClient().timelineEvent.findMany({
      where: { tripId },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });
    return records.map(mapPersistedTimelineEvent);
  }
}
