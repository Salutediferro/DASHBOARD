-- Adds PENDING to AppointmentStatus. Patient first-contact bookings
-- (i.e. with a professional the patient has no ACTIVE CareRelationship
-- with) now land as PENDING. The professional must explicitly accept
-- before the appointment becomes SCHEDULED and the CareRelationship is
-- created — booking alone no longer enrolls the patient into the
-- professional's roster.
--
-- Idempotent (IF NOT EXISTS) to mirror the rest of this folder, where
-- migrations have been applied by hand to Supabase before
-- `_prisma_migrations` was in sync.

ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
