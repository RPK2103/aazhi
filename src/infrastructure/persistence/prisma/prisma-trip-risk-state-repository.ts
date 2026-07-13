import type {
  CreateTripRiskStateSnapshotInput,
  TripRiskStateRepository,
} from "@/application/persistence/persistence-ports";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import { mapPersistedTripRiskStateSnapshot } from "@/infrastructure/persistence/prisma/persistence-mappers";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/prisma-client";

export class PrismaTripRiskStateRepository implements TripRiskStateRepository {
  async create(input: CreateTripRiskStateSnapshotInput) {
    try {
      const record = await getPrismaClient().tripRiskStateSnapshot.create({
        data: {
          id: input.id,
          tripId: input.tripId,
          version: input.version,
          posture: input.posture,
          stateJson: input.stateJson as object,
          lastEvaluatedAt: input.lastEvaluatedAt,
          createdAt: input.createdAt,
        },
      });
      return mapPersistedTripRiskStateSnapshot(record);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new PersistenceConflictError(
          `Trip risk state snapshot already exists for trip ${input.tripId} version ${input.version}`,
        );
      }
      throw error;
    }
  }

  async findLatestByTripId(tripId: string) {
    const record = await getPrismaClient().tripRiskStateSnapshot.findFirst({
      where: { tripId },
      orderBy: [{ version: "desc" }, { id: "desc" }],
    });
    return record ? mapPersistedTripRiskStateSnapshot(record) : null;
  }

  async findByTripIdAndVersion(tripId: string, version: number) {
    const record = await getPrismaClient().tripRiskStateSnapshot.findUnique({
      where: {
        tripId_version: {
          tripId,
          version,
        },
      },
    });
    return record ? mapPersistedTripRiskStateSnapshot(record) : null;
  }
}
