-- Adds weekly scheduling + daily intake tracking to self-managed therapy
-- items (AT-5/7/9 feedback).
--
--  * `TherapyItem."daysOfWeek"` is the set of weekdays the user wants
--    the supplement on. Empty set = every day, which keeps all existing
--    rows behaving as before without a backfill.
--
--  * `TherapyIntake` is a daily check-off log. One row per (item, date);
--    `taken=false` rows are allowed so the user can explicitly say
--    "today I skipped it" (distinct from "no answer yet" = no row).
--
-- RLS follows the same pattern as Medication / SymptomLog: default deny,
-- Prisma bypasses via the postgres role.

-- 1) Day-of-week enum and new column on TherapyItem.
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

ALTER TABLE "TherapyItem"
  ADD COLUMN "daysOfWeek" "DayOfWeek"[] NOT NULL DEFAULT ARRAY[]::"DayOfWeek"[];

-- 2) TherapyIntake table.
CREATE TABLE "TherapyIntake" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId"     UUID NOT NULL,
  "patientId"  UUID NOT NULL,
  "date"       DATE NOT NULL,
  "taken"      BOOLEAN NOT NULL,
  "takenAt"    TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TherapyIntake_item_fkey"
    FOREIGN KEY ("itemId") REFERENCES "TherapyItem"("id") ON DELETE CASCADE,
  CONSTRAINT "TherapyIntake_patient_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "TherapyIntake_itemId_date_key"
  ON "TherapyIntake" ("itemId", "date");
CREATE INDEX "TherapyIntake_patientId_date_idx"
  ON "TherapyIntake" ("patientId", "date");

ALTER TABLE "TherapyIntake" ENABLE ROW LEVEL SECURITY;
