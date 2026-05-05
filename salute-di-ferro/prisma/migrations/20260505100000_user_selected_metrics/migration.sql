-- User-selected health metrics. Stores members of OVERVIEW_METRIC_KEYS
-- (src/lib/overview-metric-keys.ts). Drives the cards shown on the
-- dashboard overview, the categories/cards visible on the health page,
-- and the rilevazione form filter. Empty array = OVERVIEW_DEFAULT
-- applied client-side.
--
-- Idempotent (IF NOT EXISTS) to mirror the rest of this folder, where
-- migrations have been applied by hand to Supabase before
-- `_prisma_migrations` was in sync.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "selectedMetrics" TEXT[] NOT NULL DEFAULT '{}';
