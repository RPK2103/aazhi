import type { VesselConcern } from "@/domain/risk";
import type { VesselConcernRepository } from "@/application/persistence/persistence-ports";
import { PersistenceConflictError } from "@/application/persistence/persistence-errors";
import { mapPersistedVesselConcern } from "@/infrastructure/persistence/prisma/persistence-mappers";
import { getPrismaClient } from "@/infrastructure/persistence/prisma/prisma-client";

export class PrismaVesselConcernRepository implements VesselConcernRepository {
  async create(
    concern: VesselConcern,
    timestamps: { createdAt: string; updatedAt: string },
  ) {
    try {
      const record = await getPrismaClient().vesselConcern.create({
        data: {
          id: concern.id,
          vesselId: concern.vesselId,
          concept: concern.concept,
          summary: concern.summary,
          status: concern.status,
          reportedAt: concern.reportedAt,
          resolutionReportedAt: concern.resolutionReportedAt ?? null,
          resolvedAt: concern.resolvedAt ?? null,
          dismissedAt: concern.dismissedAt ?? null,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
        },
      });
      return mapPersistedVesselConcern(record);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new PersistenceConflictError(`Concern already exists: ${concern.id}`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    const record = await getPrismaClient().vesselConcern.findUnique({ where: { id } });
    return record ? mapPersistedVesselConcern(record) : null;
  }

  async findByVesselId(vesselId: string) {
    const records = await getPrismaClient().vesselConcern.findMany({
      where: { vesselId },
      orderBy: [{ reportedAt: "asc" }, { id: "asc" }],
    });
    return records.map(mapPersistedVesselConcern);
  }

  async update(concern: VesselConcern, timestamps: { updatedAt: string }) {
    const record = await getPrismaClient().vesselConcern.update({
      where: { id: concern.id },
      data: {
        concept: concern.concept,
        summary: concern.summary,
        status: concern.status,
        reportedAt: concern.reportedAt,
        resolutionReportedAt: concern.resolutionReportedAt ?? null,
        resolvedAt: concern.resolvedAt ?? null,
        dismissedAt: concern.dismissedAt ?? null,
        updatedAt: timestamps.updatedAt,
      },
    });
    return mapPersistedVesselConcern(record);
  }
}
