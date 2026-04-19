-- Reminder-sent timestamps so the hourly cron doesn't double-email.
-- Nullable: null = not yet sent for that horizon.

ALTER TABLE "Appointment"
  ADD COLUMN "reminder24SentAt" TIMESTAMP(3),
  ADD COLUMN "reminder1SentAt"  TIMESTAMP(3);

-- Pre-mark every past appointment as "reminders already sent" so the
-- first cron run after the deploy doesn't try to ship stale reminders
-- for historical rows.
UPDATE "Appointment"
SET "reminder24SentAt" = "startTime",
    "reminder1SentAt"  = "startTime"
WHERE "startTime" < NOW();
