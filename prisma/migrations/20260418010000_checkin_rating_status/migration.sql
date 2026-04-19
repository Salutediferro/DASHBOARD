-- CheckIn: add self-rating, review status, and updatedAt trigger column.
-- Needed to migrate /api/check-ins from the in-memory mock store to Prisma.

CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'REVIEWED');

ALTER TABLE "CheckIn"
  ADD COLUMN "rating"    INTEGER,
  ADD COLUMN "status"    "CheckInStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "updatedAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");
