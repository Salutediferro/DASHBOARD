-- Shrinks the AppointmentType enum from 4 values to 2:
--   IN_PERSON   → "Visita in presenza"
--   VIDEO_CALL  → "Visita a distanza (video-call)"
--
-- VISIT and FOLLOW_UP are removed. The init migration also created a
-- legacy COACHING_SESSION value that never made it into the Prisma
-- schema; we collapse all three legacy values into IN_PERSON in the
-- same pass so the type swap doesn't fail on any stray row.
--
-- Postgres doesn't support dropping enum values in place, so we follow
-- the standard rename-create-swap-drop dance. The whole thing is
-- wrapped in a guard that checks pg_enum for one of the dead values,
-- so re-applying the migration on an already-shrunken DB is a no-op
-- (consistent with the IF NOT EXISTS pattern used elsewhere in this
-- folder — Supabase has been hand-tracked at times).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AppointmentType'
      AND e.enumlabel IN ('VISIT', 'FOLLOW_UP', 'COACHING_SESSION')
  ) THEN
    -- 1. Migrate any rows still on the soon-to-be-removed values.
    --    Cast through text so this works regardless of which legacy
    --    values are actually present.
    UPDATE "Appointment"
       SET "type" = 'IN_PERSON'::"AppointmentType"
     WHERE "type"::text IN ('VISIT', 'FOLLOW_UP', 'COACHING_SESSION');

    -- 2. The column has a DEFAULT that references the old type; drop
    --    it temporarily so we can change the column type.
    ALTER TABLE "Appointment" ALTER COLUMN "type" DROP DEFAULT;

    -- 3. Rename the old enum out of the way and create the new one.
    ALTER TYPE "AppointmentType" RENAME TO "AppointmentType_old";
    CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'VIDEO_CALL');

    -- 4. Swap the column to the new type. All remaining values are
    --    already in the new enum thanks to step 1.
    ALTER TABLE "Appointment"
      ALTER COLUMN "type" TYPE "AppointmentType"
      USING ("type"::text::"AppointmentType");

    -- 5. Restore the default.
    ALTER TABLE "Appointment"
      ALTER COLUMN "type" SET DEFAULT 'VIDEO_CALL'::"AppointmentType";

    -- 6. Drop the old enum.
    DROP TYPE "AppointmentType_old";
  END IF;
END
$$;
