-- Phase 9: marine forecast reference location for active trips
ALTER TABLE "Trip"
ADD COLUMN "marineReferenceLatitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "marineReferenceLongitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "marineReferenceLabel" TEXT;

-- Remove defaults after backfill so new rows must supply coordinates explicitly
ALTER TABLE "Trip"
ALTER COLUMN "marineReferenceLatitude" DROP DEFAULT,
ALTER COLUMN "marineReferenceLongitude" DROP DEFAULT;
