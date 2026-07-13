import type { CreateTripInput, TripRepository } from "@/application/persistence/persistence-ports";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import { mapPersistedTrip } from "@/infrastructure/persistence/prisma/persistence-mappers";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/prisma-client";

export class PrismaTripRepository implements TripRepository {
  async create(
    input: CreateTripInput,
    timestamps: { createdAt: string; updatedAt: string },
  ) {
    try {
      const record = await getPrismaClient().trip.create({
        data: {
          id: input.id,
          vesselId: input.vesselId,
          crewCount: input.crewCount,
          plannedDurationHours: input.plannedDurationHours,
          status: input.status,
          marineReferenceLatitude: input.marineReferenceLatitude,
          marineReferenceLongitude: input.marineReferenceLongitude,
          marineReferenceLabel: input.marineReferenceLabel ?? null,
          startedAt: input.startedAt ?? null,
          expectedReturnAt: input.expectedReturnAt ?? null,
          endedAt: input.endedAt ?? null,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
        },
      });
      return mapPersistedTrip(record);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new PersistenceConflictError(`Trip already exists: ${input.id}`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    const record = await getPrismaClient().trip.findUnique({ where: { id } });
    return record ? mapPersistedTrip(record) : null;
  }
}
