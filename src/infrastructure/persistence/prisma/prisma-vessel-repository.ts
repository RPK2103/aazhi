import type {
  CreateVesselInput,
  VesselRepository,
} from "@/application/persistence/persistence-ports";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import { mapPersistedVessel } from "@/infrastructure/persistence/prisma/persistence-mappers";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/prisma-client";

export class PrismaVesselRepository implements VesselRepository {
  async create(
    input: CreateVesselInput,
    timestamps: { createdAt: string; updatedAt: string },
  ) {
    try {
      const record = await getPrismaClient().vessel.create({
        data: {
          id: input.id,
          displayName: input.displayName,
          registrationReference: input.registrationReference ?? null,
          vesselType: input.vesselType,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
        },
      });
      return mapPersistedVessel(record);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new PersistenceConflictError(`Vessel already exists: ${input.id}`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    const record = await getPrismaClient().vessel.findUnique({ where: { id } });
    return record ? mapPersistedVessel(record) : null;
  }
}
