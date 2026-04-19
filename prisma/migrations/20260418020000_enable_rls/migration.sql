-- Row-Level Security: default-deny on every Prisma-managed table.
--
-- Context
-- -------
-- All application DB access goes through Prisma, which connects as the
-- `postgres` role via the Supabase pooler. That role has BYPASSRLS=true,
-- so enabling RLS does not affect server-side queries. The `service_role`
-- used by our Supabase admin client (avatar upload, medical-report
-- storage) also has BYPASSRLS=true.
--
-- What this migration does
-- ------------------------
-- It enables RLS on every table and intentionally adds NO policies. The
-- default-deny result is that anyone connecting with the `anon` or
-- `authenticated` role (e.g. a hypothetical client-side `supabase.from(
-- 'User').select()` using the anon key) cannot read or write anything.
--
-- Today the codebase never makes direct data-plane calls via the Supabase
-- JS SDK (only auth / storage). So nothing in the app changes. But if a
-- future feature reaches for supabase.from(...) by mistake, PostgreSQL
-- now fails closed instead of leaking Art. 9 health data.
--
-- FORCE variant
-- -------------
-- `ENABLE ROW LEVEL SECURITY` alone lets the table OWNER bypass RLS
-- (useful for maintenance). We use the plain form because:
--   - our Prisma role is not the table owner, it's a privileged role
--     with BYPASSRLS, which we want to keep unrestricted;
--   - the owner is a Supabase-managed role that we don't want to
--     accidentally lock out of its own schema.

ALTER TABLE "Organization"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CareRelationship"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BiometricLog"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckIn"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvailabilitySlot"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiConversation"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalReport"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportPermission"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation"        ENABLE ROW LEVEL SECURITY;

-- Revoke the "ANYONE can do anything" default grants that Supabase
-- applies to new tables through its exposed `anon` and `authenticated`
-- REST roles. Belt-and-suspenders: even without any policy these grants
-- being present makes security-linter advisories noisier; removing them
-- keeps the surface minimal.
REVOKE ALL ON "Organization"     FROM anon, authenticated;
REVOKE ALL ON "User"             FROM anon, authenticated;
REVOKE ALL ON "CareRelationship" FROM anon, authenticated;
REVOKE ALL ON "BiometricLog"     FROM anon, authenticated;
REVOKE ALL ON "CheckIn"          FROM anon, authenticated;
REVOKE ALL ON "Appointment"      FROM anon, authenticated;
REVOKE ALL ON "AvailabilitySlot" FROM anon, authenticated;
REVOKE ALL ON "Subscription"     FROM anon, authenticated;
REVOKE ALL ON "AiConversation"   FROM anon, authenticated;
REVOKE ALL ON "Notification"     FROM anon, authenticated;
REVOKE ALL ON "MedicalReport"    FROM anon, authenticated;
REVOKE ALL ON "ReportPermission" FROM anon, authenticated;
REVOKE ALL ON "AuditLog"         FROM anon, authenticated;
REVOKE ALL ON "Invitation"       FROM anon, authenticated;
