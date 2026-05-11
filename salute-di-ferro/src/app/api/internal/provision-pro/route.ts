import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import {
  STAFF_GATE_COOKIE,
  verifyGateToken,
} from "@/lib/staff-provision/token";

const bodySchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri").max(200),
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(80),
  lastName: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  role: z.enum(["DOCTOR", "COACH", "ADMIN"]),
});

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(STAFF_GATE_COOKIE)?.value;
  if (!verifyGateToken(token)) {
    return NextResponse.json({ error: "Gate scaduto" }, { status: 401 });
  }

  const rl = await rateLimit({
    key: requestKey(req, "staff-provision"),
    limit: 10,
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, password, firstName, lastName, sex, role } = parsed.data;

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

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: role satisfies UserRole },
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
        sex,
        role,
        organizationId: org.id,
      },
      select: { id: true, email: true, role: true, fullName: true },
    });
    return NextResponse.json(dbUser, { status: 201 });
  } catch (e) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    const message = e instanceof Error ? e.message : "DB insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
