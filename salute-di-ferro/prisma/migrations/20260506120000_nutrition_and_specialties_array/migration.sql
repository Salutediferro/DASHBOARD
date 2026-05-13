-- Nutrition feature + normalize User.specialties to TEXT[].
--
-- 1. Convert "User"."specialties" from TEXT (comma-separated) to TEXT[].
--    Existing values are split on commas, trimmed, with empty fragments
--    dropped. NULL becomes the empty array. Default is the empty array,
--    column becomes NOT NULL so the app never has to handle null vs [].
--    The transform uses a temp SQL function instead of an inline
--    subquery — Postgres rejects subqueries inside ALTER COLUMN's
--    USING expression, so the original SQL would fail to replay on a
--    fresh shadow DB.
-- 2. Create the MealSlot enum, the NutritionPlan model (doctor-authored,
--    one active per patient via a partial unique index on archivedAt),
--    and the NutritionDiaryEntry model (patient-authored daily food log).
-- 3. Enable RLS + revoke the default Supabase grants on the new tables,
--    matching the policy in 20260418020000_enable_rls.
--
-- Idempotent (IF NOT EXISTS / DO blocks) to mirror the rest of this
-- folder, where migrations have been applied by hand to Supabase.

-- 1. specialties TEXT -> TEXT[]
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'specialties'
      AND data_type = 'text'
  ) THEN
    -- Session-scoped helper. SQL functions are legal in USING clauses;
    -- the original migration inlined the equivalent SELECT and Postgres
    -- refused with "cannot use subquery in transform expression".
    CREATE OR REPLACE FUNCTION pg_temp.__split_specialties(src TEXT) RETURNS TEXT[] AS $f$
      SELECT COALESCE(
        array_agg(btrim(s) ORDER BY ord)
          FILTER (WHERE btrim(s) <> ''),
        ARRAY[]::TEXT[]
      )
      FROM unnest(string_to_array(src, ',')) WITH ORDINALITY AS x(s, ord);
    $f$ LANGUAGE sql IMMUTABLE;

    ALTER TABLE "User"
      ALTER COLUMN "specialties" DROP DEFAULT,
      ALTER COLUMN "specialties" TYPE TEXT[] USING (
        CASE
          WHEN "specialties" IS NULL OR btrim("specialties") = '' THEN ARRAY[]::TEXT[]
          ELSE pg_temp.__split_specialties("specialties")
        END
      );
    ALTER TABLE "User"
      ALTER COLUMN "specialties" SET DEFAULT ARRAY[]::TEXT[],
      ALTER COLUMN "specialties" SET NOT NULL;
  END IF;
END
$$;

-- 2. MealSlot enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MealSlot') THEN
    CREATE TYPE "MealSlot" AS ENUM (
      'BREAKFAST',
      'MORNING_SNACK',
      'LUNCH',
      'AFTERNOON_SNACK',
      'DINNER',
      'EVENING_SNACK'
    );
  END IF;
END
$$;

-- 3. NutritionPlan
CREATE TABLE IF NOT EXISTS "NutritionPlan" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId"          UUID NOT NULL,
  "authorId"           UUID NOT NULL,
  "title"              TEXT NOT NULL,
  "notes"              TEXT,
  "targetCaloriesKcal" INTEGER,
  "targetProteinG"     DOUBLE PRECISION,
  "targetCarbsG"       DOUBLE PRECISION,
  "targetFatG"         DOUBLE PRECISION,
  "meals"              JSONB NOT NULL DEFAULT '[]'::jsonb,
  "startDate"          DATE,
  "endDate"            DATE,
  "archivedAt"         TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "NutritionPlan_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "NutritionPlan_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "NutritionPlan_patientId_idx"
  ON "NutritionPlan" ("patientId");
CREATE INDEX IF NOT EXISTS "NutritionPlan_authorId_idx"
  ON "NutritionPlan" ("authorId");
CREATE INDEX IF NOT EXISTS "NutritionPlan_patientId_archivedAt_idx"
  ON "NutritionPlan" ("patientId", "archivedAt");

-- One active (archivedAt IS NULL) plan per patient. Older plans are
-- archived and remain visible in the patient "Piani precedenti" view.
CREATE UNIQUE INDEX IF NOT EXISTS "NutritionPlan_patientId_active_unique"
  ON "NutritionPlan" ("patientId")
  WHERE "archivedAt" IS NULL;

-- 4. NutritionDiaryEntry
CREATE TABLE IF NOT EXISTS "NutritionDiaryEntry" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId"    UUID NOT NULL,
  "consumedAt"   TIMESTAMPTZ NOT NULL,
  "mealSlot"     "MealSlot" NOT NULL,
  "description"  TEXT NOT NULL,
  "caloriesKcal" INTEGER NOT NULL,
  "proteinG"     DOUBLE PRECISION,
  "carbsG"       DOUBLE PRECISION,
  "fatG"         DOUBLE PRECISION,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "NutritionDiaryEntry_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "NutritionDiaryEntry_patientId_consumedAt_idx"
  ON "NutritionDiaryEntry" ("patientId", "consumedAt");

-- 5. RLS — match 20260418020000_enable_rls. Default-deny: app reads via
-- Prisma which connects with BYPASSRLS, anon/authenticated cannot touch.
ALTER TABLE "NutritionPlan"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionDiaryEntry"  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "NutritionPlan"       FROM anon, authenticated;
REVOKE ALL ON "NutritionDiaryEntry" FROM anon, authenticated;
