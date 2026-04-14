/**
 * One-off cleanup: remove Supabase auth users in the legacy "@sdf.local"
 * domain left over from the pre-migration baseline seed. These are
 * orphans — no matching Prisma User row exists — and their
 * app_metadata.role is the dead "CLIENT" enum value from the
 * fitness-era schema.
 *
 * Ran once on 2026-04-14 against project zzpzptvtshyetdpvwhfc. Kept in
 * `scripts/` for audit traceability; re-running on a clean project is a
 * no-op (listUsers returns nothing matching the domain).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { createAdminClient } from "../src/lib/supabase/admin";

const TARGET_DOMAIN = "@sdf.local";

async function main() {
  const admin = createAdminClient();

  // Page through every auth user and collect the ones we want to nuke.
  const victims: { id: string; email: string | null }[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email?.toLowerCase().endsWith(TARGET_DOMAIN)) {
        victims.push({ id: u.id, email: u.email });
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }

  console.log(
    `Found ${victims.length} auth user(s) with email ending in "${TARGET_DOMAIN}"`,
  );

  let deleted = 0;
  let failed = 0;
  for (const v of victims) {
    process.stdout.write(`  - ${v.email}  (${v.id.slice(0, 8)}…) ... `);
    const { error } = await admin.auth.admin.deleteUser(v.id);
    if (error) {
      failed += 1;
      console.log(`FAIL: ${error.message}`);
    } else {
      deleted += 1;
      console.log("deleted");
    }
  }

  console.log("");
  console.log(`Done. Deleted: ${deleted}, failed: ${failed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
