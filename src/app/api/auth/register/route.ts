import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/auth/register
 *
 * - Public PATIENT signup: anyone may call with role=PATIENT. Creates a
 *   Supabase auth user (password set) + Prisma User row with role PATIENT.
 * - Admin-provisioned DOCTOR / COACH: caller must be an authenticated
 *   ADMIN; the request body selects the target role.
 * - ADMIN creation is NOT exposed here (seed or manual promotion).
 *
 * The role is mirrored into Supabase app_metadata so the middleware can
 * dispatch without hitting Prisma on every request. The Prisma row remains
 * the source of truth.
 */
export async function POST(req: Request) {
  // Rate limit: 5 registrations per IP per 10 minutes. Protects against
  // basic enumeration / flood.
  const rl = rateLimit({
    key: requestKey(req, "auth-register"),
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi, riprova più tardi" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    email,
    password,
    firstName,
    lastName,
    sex,
    birthDate,
    role: targetRole,
  } = parsed.data;

  // Authorization: only ADMIN may provision DOCTOR/COACH. PATIENT is public.
  if (targetRole !== "PATIENT") {
    const supabase = await createClient();
    const {
      data: { user: callerAuth },
    } = await supabase.auth.getUser();
    if (!callerAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const caller = await prisma.user.findUnique({
      where: { id: callerAuth.id },
      select: { role: true },
    });
    if (!caller || caller.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const org = await prisma.organization.findFirst({
    where: { slug: "salute-di-ferro" },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json(
      { error: "Default organization missing" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  // Create the Supabase auth user with role in app_metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: targetRole satisfies UserRole },
    user_metadata: { firstName, lastName },
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Auth user creation failed" },
      { status: 400 },
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    const dbUser = await prisma.user.create({
      data: {
        id: created.user.id,
        email,
        fullName,
        firstName,
        lastName,
        sex: sex ?? null,
        birthDate: birthDate ? new Date(birthDate) : null,
        role: targetRole,
        organizationId: org.id,
      },
      select: { id: true, email: true, role: true, fullName: true },
    });
    await logAudit({
      actorId: dbUser.id,
      action:
        targetRole === "PATIENT" ? "USER_REGISTER" : "ADMIN_USER_PROVISION",
      entityType: "User",
      entityId: dbUser.id,
      metadata: { role: targetRole, email },
      request: req,
    });
    return NextResponse.json(dbUser, { status: 201 });
  } catch (e) {
    // Roll back the auth user if the Prisma insert fails so we don't leave
    // an orphaned auth record.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    const message = e instanceof Error ? e.message : "DB insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
