-- Per-professional Google OAuth linkage. Stores the refresh token used to
-- mint Meet links and write to the pro's Google Calendar when they accept
-- an appointment request. One row per User; deleting the User cascades.
--
-- Tokens are stored plain — matching User.calendarFeedToken handling. The
-- row only ever exists server-side (no Supabase RLS exposure).
--
-- Idempotent (IF NOT EXISTS) to mirror the rest of this folder.

CREATE TABLE IF NOT EXISTS "GoogleAccount" (
  "userId"       UUID         PRIMARY KEY,
  "googleSub"    TEXT         NOT NULL,
  "email"        TEXT         NOT NULL,
  "refreshToken" TEXT         NOT NULL,
  "accessToken"  TEXT,
  "expiryDate"   TIMESTAMP(3),
  "scope"        TEXT         NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleAccount_googleSub_key"
  ON "GoogleAccount" ("googleSub");

-- Mirror of the Google Calendar event we created when the pro accepted
-- this appointment. Lets PATCH /api/appointments/[id] patch the same
-- event on reschedule, and DELETE … cancel it. Null when the pro has no
-- linked Google account (or when the Calendar API call failed — the
-- appointment row still exists either way).
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
