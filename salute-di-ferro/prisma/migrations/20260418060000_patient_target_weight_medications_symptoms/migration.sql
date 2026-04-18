-- Patient-side tracking additions: weight goal, structured medication
-- schedule, and a daily symptom / wellbeing journal.
--
-- These columns/tables are owned by the patient and read by authorized
-- professionals via the existing CareRelationship checks (no bespoke
-- policy — enforcement happens in the API layer, same pattern as
-- BiometricLog / CheckIn).

-- 1) Target weight (kg) — optional goal the patient sets for themselves.
ALTER TABLE "User"
  ADD COLUMN "targetWeightKg" DOUBLE PRECISION;

-- 2) Structured medications — replaces the free-text User.medications as
--    the preferred entry point. The legacy column is kept for backward
--    compatibility (read-only in the UI once migrated).
CREATE TABLE "Medication" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId"  UUID NOT NULL,
  "name"       TEXT NOT NULL,
  "dose"       TEXT,
  "frequency"  TEXT,
  "notes"      TEXT,
  "startDate"  DATE,
  "endDate"    DATE,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Medication_patient_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Medication_patientId_active_idx"
  ON "Medication" ("patientId", "active");
CREATE INDEX "Medication_patientId_startDate_idx"
  ON "Medication" ("patientId", "startDate" DESC);

-- RLS — default deny, Prisma bypasses via postgres role.
ALTER TABLE "Medication" ENABLE ROW LEVEL SECURITY;

-- 3) Daily symptom / wellbeing journal.
CREATE TABLE "SymptomLog" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" UUID NOT NULL,
  "date"      DATE NOT NULL,
  "mood"      SMALLINT,
  "energy"    SMALLINT,
  "sleepQuality" SMALLINT,
  "symptoms"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SymptomLog_patient_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "SymptomLog_mood_range"
    CHECK ("mood" IS NULL OR ("mood" BETWEEN 1 AND 5)),
  CONSTRAINT "SymptomLog_energy_range"
    CHECK ("energy" IS NULL OR ("energy" BETWEEN 1 AND 5)),
  CONSTRAINT "SymptomLog_sleep_range"
    CHECK ("sleepQuality" IS NULL OR ("sleepQuality" BETWEEN 1 AND 5))
);
-- One entry per patient per calendar day (UPSERT from the UI).
CREATE UNIQUE INDEX "SymptomLog_patient_date_key"
  ON "SymptomLog" ("patientId", "date");
CREATE INDEX "SymptomLog_patientId_date_idx"
  ON "SymptomLog" ("patientId", "date" DESC);

ALTER TABLE "SymptomLog" ENABLE ROW LEVEL SECURITY;
