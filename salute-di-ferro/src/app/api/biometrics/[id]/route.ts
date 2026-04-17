import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  biometricPatchSchema,
  flattenBiometric,
} from "@/lib/validators/biometric";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Load a log and check that the caller is allowed to see it:
 * - owner patient: always
 * - doctor/coach with ACTIVE CareRelationship on the patient
 * - admin
 */
async function loadAuthorized(authUserId: string, logId: string) {
  const me = await prisma.user.findUnique({
    where: { id: authUserId },
    select: { id: true, role: true, heightCm: true },
  });
  if (!me) return { error: "Unauthorized", status: 401 } as const;

  const row = await prisma.biometricLog.findUnique({ where: { id: logId } });
  if (!row) return { error: "Not found", status: 404 } as const;

  if (row.patientId === me.id) {
    return { me, row, readOnly: false } as const;
  }
  if (me.role === "ADMIN") {
    return { me, row, readOnly: true } as const;
  }
  if (me.role === "DOCTOR" || me.role === "COACH") {
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: row.patientId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) return { error: "Forbidden", status: 403 } as const;
    return { me, row, readOnly: true } as const;
  }
  return { error: "Forbidden", status: 403 } as const;
}

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await loadAuthorized(user.id, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.row);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await loadAuthorized(user.id, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.readOnly) {
    return NextResponse.json(
      { error: "Solo il paziente può modificare le proprie misurazioni" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = biometricPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const data = flattenBiometric(parsed.data);
  const weight =
    typeof data.weight === "number" ? (data.weight as number) : null;
  if (weight != null && result.me.heightCm != null) {
    const hM = result.me.heightCm / 100;
    data.bmi = Number((weight / (hM * hM)).toFixed(2));
  }

  const updated = await prisma.biometricLog.update({
    where: { id },
    data: data as never,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await loadAuthorized(user.id, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.readOnly) {
    return NextResponse.json(
      { error: "Solo il paziente può cancellare le proprie misurazioni" },
      { status: 403 },
    );
  }

  await prisma.biometricLog.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
