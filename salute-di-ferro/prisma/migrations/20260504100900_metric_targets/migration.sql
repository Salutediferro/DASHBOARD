-- Per-metric personal targets, persisted server-side (replaces the
-- localStorage-only first cut). Drives the red/yellow/green grade on
-- the patient overview cards and the health page, and gives the
-- upcoming native app a single source of truth.
--
-- One row per (patientId, metricKey). Composite metrics (blood
-- pressure today, possibly more later) populate `secondary` for the
-- diastolic side; everything else uses `value` only. The shape stays
-- inside one table so listing all targets is a single query.
--
-- RLS follows the same pattern as SymptomLog / TherapyIntake: default
-- deny, Prisma bypasses via the postgres role.
--
-- Every DDL is idempotent (IF NOT EXISTS) because this migration was
-- applied by hand to Supabase before the matching `_prisma_migrations`
-- row existed, so Vercel's `prisma migrate deploy` would otherwise
-- 23P02 on the next push. Running this whole file twice is a no-op.

CREATE TABLE IF NOT EXISTS "MetricTarget" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "metricKey" TEXT NOT NULL,
  "value"     DOUBLE PRECISION NOT NULL,
  "secondary" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetricTarget_patient_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetricTarget_patientId_metricKey_key"
  ON "MetricTarget" ("patientId", "metricKey");
CREATE INDEX IF NOT EXISTS "MetricTarget_patientId_idx"
  ON "MetricTarget" ("patientId");

-- ENABLE ROW LEVEL SECURITY is already idempotent — running it on a
-- table that already has RLS on is a no-op, no guard needed.
ALTER TABLE "MetricTarget" ENABLE ROW LEVEL SECURITY;
