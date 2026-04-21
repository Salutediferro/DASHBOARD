import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  biometricInputSchema,
  flattenBiometric,
} from "@/lib/validators/biometric";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Resolve which patient's logs the caller is allowed to see.
 * - PATIENT: only their own data (patientId param ignored / must match)
 * - DOCTOR/COACH: must have an ACTIVE CareRelationship with the patient
 * - ADMIN: unrestricted
 */
async function authorizedPatientId(
  authUserId: string,
  explicitPatientId: string | null,
): Promise<
  | { patientId: string; readOnly: boolean }
  | { error: string; status: number }
> {
  const me = await prisma.user.findUnique({
    where: { id: authUserId },
    select: { id: true, role: true },
  });
  if (!me) return { error: "Unauthorized", status: 401 };

  if (me.role === "PATIENT") {
    const targetId = explicitPatientId ?? me.id;
    if (targetId !== me.id) {
      return { error: "Forbidden", status: 403 };
    }
    return { patientId: me.id, readOnly: false };
  }

  if (me.role === "DOCTOR" || me.role === "COACH" || me.role === "ADMIN") {
    if (!explicitPatientId) {
      return { error: "patientId required", status: 400 };
    }
    if (me.role === "ADMIN") {
      return { patientId: explicitPatientId, readOnly: true };
    }
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: explicitPatientId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) return { error: "Forbidden", status: 403 };
    return { patientId: explicitPatientId, readOnly: true };
  }

  return { error: "Forbidden", status: 403 };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const auth = await authorizedPatientId(
    user.id,
    searchParams.get("patientId"),
  );
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("perPage") ?? DEFAULT_PAGE_SIZE)),
  );

  const where: Record<string, unknown> = { patientId: auth.patientId };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.date = range;
  }

  const [items, total] = await Promise.all([
    prisma.biometricLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.biometricLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, heightCm: true },
  });
  if (!me || me.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Solo i clienti possono inserire misurazioni" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = biometricInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const data = flattenBiometric(parsed.data);

  // Server-side BMI: if we have weight + height, compute and overwrite.
  const weight =
    typeof data.weight === "number" ? (data.weight as number) : null;
  if (weight != null && me.heightCm != null) {
    const hM = me.heightCm / 100;
    data.bmi = Number((weight / (hM * hM)).toFixed(2));
  }

  const created = await prisma.biometricLog.create({
    data: {
      ...data,
      patientId: me.id,
    } as never,
  });
  return NextResponse.json(created, { status: 201 });
}
