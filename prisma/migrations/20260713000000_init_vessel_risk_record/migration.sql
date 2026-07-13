-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "registrationReference" TEXT,
    "vesselType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vessel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VesselConcern" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "resolutionReportedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VesselConcern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "crewCount" INTEGER NOT NULL,
    "plannedDurationHours" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "expectedReturnAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRiskStateSnapshot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "posture" TEXT NOT NULL,
    "stateJson" JSONB NOT NULL,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRiskStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VesselConcern_vesselId_idx" ON "VesselConcern"("vesselId");

-- CreateIndex
CREATE INDEX "VesselConcern_vesselId_status_idx" ON "VesselConcern"("vesselId", "status");

-- CreateIndex
CREATE INDEX "Trip_vesselId_idx" ON "Trip"("vesselId");

-- CreateIndex
CREATE INDEX "TripRiskStateSnapshot_tripId_idx" ON "TripRiskStateSnapshot"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripRiskStateSnapshot_tripId_version_key" ON "TripRiskStateSnapshot"("tripId", "version");

-- CreateIndex
CREATE INDEX "TimelineEvent_tripId_occurredAt_idx" ON "TimelineEvent"("tripId", "occurredAt");

-- AddForeignKey
ALTER TABLE "VesselConcern" ADD CONSTRAINT "VesselConcern_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRiskStateSnapshot" ADD CONSTRAINT "TripRiskStateSnapshot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
