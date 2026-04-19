/**
 * One-off: rotate every test account's password to a random 48-byte
 * base64url string. The rotated password is never printed or persisted
 * anywhere — nobody can log in as these accounts until a real password
 * reset email is sent (and @test.local/@salutediferro.test mailboxes
 * don't exist, so effectively they become dormant).
 *
 * Invariants
 *   - `simonerampazzoo@gmail.com` (real admin) is preserved untouched.
 *   - Any account on a preserved domain (@gmail.com, etc.) is preserved.
 *   - The DB row is left intact — demo data (CareRelationships,
 *     Appointments, BiometricLogs, MedicalReports, AvailabilitySlots)
 *     remains available for future screenshots or internal review.
 *
 * Usage:
 *   npx tsx scripts/archive/rotate-test-passwords.ts
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars");
}

const TEST_EMAIL_DOMAINS = ["@salutediferro.test", "@test.local"];
const PRESERVED_EMAIL_DOMAINS = ["@gmail.com"];

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isTestEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (PRESERVED_EMAIL_DOMAINS.some((d) => lower.endsWith(d))) return false;
  return TEST_EMAIL_DOMAINS.some((d) => lower.endsWith(d));
}

async function main() {
  const all: { id: string; email: string | undefined }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    all.push(
      ...data.users.map((u) => ({ id: u.id, email: u.email ?? undefined })),
    );
    if (data.users.length < 1000) break;
    page++;
  }

  const targets = all.filter((u) => isTestEmail(u.email));
  console.log(`Found ${targets.length} test accounts to rotate.`);

  let rotated = 0;
  for (const u of targets) {
    const newPassword = crypto.randomBytes(48).toString("base64url");
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      password: newPassword,
    });
    if (error) {
      console.error(`  FAIL ${u.email}: ${error.message}`);
      continue;
    }
    rotated++;
    console.log(`  rotated ${u.email}`);
  }

  console.log(`\nDone. Rotated ${rotated}/${targets.length} accounts.`);
  console.log(
    "Passwords are NOT stored anywhere. Accounts are effectively dormant.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
