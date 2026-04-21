-- Rename Medication → TherapyItem and split therapy into two verticals via
-- `kind`. PRESCRIBED items are written by a doctor and visible to the
-- whole care team; SELF items are patient-entered supplements that can
-- carry an optional in-app reminder. ACL enforcement lives in
-- src/lib/services/therapy.ts; `kind` is immutable after creation.
--
-- All existing rows were patient-entered (the legacy /api/medications
-- endpoint only allowed POST by role=PATIENT), so the backfill default
-- of SELF is correct without a WHERE-filtered UPDATE.
--
-- RLS was enabled on "Medication" in migration 20260418060000 and is
-- preserved by ALTER TABLE RENAME — no re-enable needed.

-- 1) Enum
CREATE TYPE "TherapyKind" AS ENUM ('PRESCRIBED', 'SELF');

-- 2) Rename the table and everything Prisma named after it. Postgres
--    does not cascade renames from ALTER TABLE RENAME, so we rename
--    the primary key, the FK, and the two indexes explicitly.
ALTER TABLE "Medication" RENAME TO "TherapyItem";
ALTER TABLE "TherapyItem" RENAME CONSTRAINT "Medication_pkey" TO "TherapyItem_pkey";
ALTER TABLE "TherapyItem" RENAME CONSTRAINT "Medication_patient_fkey" TO "TherapyItem_patientId_fkey";
ALTER INDEX "Medication_patientId_active_idx" RENAME TO "TherapyItem_patientId_active_idx";
ALTER INDEX "Medication_patientId_startDate_idx" RENAME TO "TherapyItem_patientId_startDate_idx";

-- 3) New columns. `kind` defaults to SELF (backfill); `prescribedById`
--    is NULL for legacy rows and set for every future PRESCRIBED item.
ALTER TABLE "TherapyItem"
  ADD COLUMN "kind"            "TherapyKind" NOT NULL DEFAULT 'SELF',
  ADD COLUMN "prescribedById"  UUID,
  ADD COLUMN "reminderTime"    TIME,
  ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "TherapyItem"
  ADD CONSTRAINT "TherapyItem_prescribedById_fkey"
  FOREIGN KEY ("prescribedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- 4) Replace (patientId, active) with (patientId, kind, active). Every
--    list query filters by kind, so the compound index pays off.
DROP INDEX "TherapyItem_patientId_active_idx";
CREATE INDEX "TherapyItem_patientId_kind_active_idx"
  ON "TherapyItem" ("patientId", "kind", "active");

CREATE INDEX "TherapyItem_prescribedById_idx"
  ON "TherapyItem" ("prescribedById");
