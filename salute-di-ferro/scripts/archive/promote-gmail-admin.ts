/**
 * Promote the owner's real gmail account to ADMIN.
 *
 *   - Finds the single auth user whose email ends with "@gmail.com"
 *     (stops with an error if there are 0 or >1 matches).
 *   - Updates app_metadata.role = "ADMIN" on the auth record.
 *   - Re-confirms the email (email_confirm: true).
 *   - Generates a one-shot recovery link so the owner can set a
 *     password from scratch.
 *   - Upserts a matching Prisma User row, re-using the auth user id as
 *     the row id so downstream joins (/api/me, role dispatcher, etc.)
 *     work without any translation layer.
 *
 * Idempotent: running twice is a no-op on the row shape. The recovery
 * link is regenerated each run (old link is invalidated by Supabase),
 * so feel free to re-run if you lose the URL.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createAdminClient } from "../../src/lib/supabase/admin";

const FIRST_NAME = "Simone";
const LAST_NAME = "Rampazzo";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
});

async function main() {
  const admin = createAdminClient();

  // ── Find the gmail auth user ──────────────────────────────────────────
  const matches: { id: string; email: string; created_at: string }[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email?.toLowerCase().endsWith("@gmail.com")) {
        matches.push({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
        });
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }

  if (matches.length === 0) {
    throw new Error("No @gmail.com auth user found — aborting.");
  }
  if (matches.length > 1) {
    console.error("Multiple @gmail.com auth users found — aborting:");
    for (const m of matches) {
      console.error(`  - ${m.email}  id=${m.id}  created=${m.created_at}`);
    }
    throw new Error("Refusing to promote: ambiguous gmail account");
  }
  const target = matches[0]!;
  console.log(
    `Promoting ${target.email} (id=${target.id.slice(0, 8)}…, created=${target.created_at.slice(0, 10)})`,
  );

  // ── Update app_metadata.role + confirm email ──────────────────────────
  const { data: updated, error: updErr } =
    await admin.auth.admin.updateUserById(target.id, {
      app_metadata: { role: "ADMIN" },
      email_confirm: true,
    });
  if (updErr) throw updErr;
  console.log(
    `  ✓ app_metadata.role = ${updated.user?.app_metadata?.role ?? "(missing)"}`,
  );

  // ── Generate a one-shot password recovery link ────────────────────────
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: target.email,
    });
  if (linkErr) throw linkErr;
  const recoveryUrl = linkData?.properties?.action_link ?? "(no link)";

  // ── Prisma row upsert ─────────────────────────────────────────────────
  const org = await prisma.organization.findFirst({
    where: { slug: "salute-di-ferro" },
    select: { id: true },
  });
  if (!org) throw new Error("Default organization missing — run seed first");

  const fullName = `${FIRST_NAME} ${LAST_NAME}`;
  const prismaUser = await prisma.user.upsert({
    where: { id: target.id },
    update: {
      role: "ADMIN",
      email: target.email,
      fullName,
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      onboardingCompleted: true,
    },
    create: {
      id: target.id,
      email: target.email,
      fullName,
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      sex: null,
      birthDate: null,
      heightCm: null,
      role: "ADMIN",
      organizationId: org.id,
      onboardingCompleted: true,
    },
    select: { id: true, email: true, role: true },
  });
  console.log(
    `  ✓ Prisma User upserted: id=${prismaUser.id.slice(0, 8)}… role=${prismaUser.role}`,
  );

  console.log("");
  console.log(`✓ Promoted ${target.email} to ADMIN.`);
  console.log(`  Recovery link: ${recoveryUrl}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
