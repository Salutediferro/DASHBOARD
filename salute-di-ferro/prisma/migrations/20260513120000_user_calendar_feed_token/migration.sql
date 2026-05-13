-- Adds an opaque per-user token for the calendar subscription feed at
-- GET /api/calendar/feed/<token>. The token is the credential, so the
-- column has a UNIQUE constraint and gets a partial index for the
-- (token IS NOT NULL) case to keep lookups fast without indexing the
-- many rows where it's still null.
--
-- Idempotent (IF NOT EXISTS) to mirror the rest of this folder, where
-- migrations have been applied by hand to Supabase before
-- `_prisma_migrations` was in sync.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "calendarFeedToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarFeedToken_key"
  ON "User" ("calendarFeedToken")
  WHERE "calendarFeedToken" IS NOT NULL;
