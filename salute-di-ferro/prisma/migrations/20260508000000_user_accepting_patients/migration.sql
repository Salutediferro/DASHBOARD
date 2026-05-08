-- Adds an `acceptingPatients` flag to the User table. Toggled by a
-- DOCTOR/COACH from their profile to advertise whether they are open
-- to new patients; the patient "Team di Ferro" search uses it to gate
-- the "Richiedi appuntamento" CTA. Defaulting to true keeps every
-- existing professional bookable on rollout.
--
-- Idempotent (IF NOT EXISTS) to mirror the rest of this folder, where
-- migrations have been applied by hand to Supabase before
-- `_prisma_migrations` was in sync.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "acceptingPatients" BOOLEAN NOT NULL DEFAULT true;
