import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createMedicationSchema } from "@/lib/validators/medication";

/**
 * GET /api/medications
 *
 * List the caller patient's medications. Sort: active first, then by
 * startDate desc (most recent at the top).
 *
 * Query params:
 *   - patientId: DOCTOR/COACH/ADMIN can read someone else's list if they
 *     have an ACTIVE CareRelationship (admin always).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const explicit = new URL(req.url).searchParams.get("patientId");
  let targetId = me.id;
  if (explicit && explicit !== me.id) {
    if (me.role === "PATIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (me.role !== "ADMIN") {
      const rel = await prisma.careRelationship.findFirst({
        where: {
          professionalId: me.id,
          patientId: explicit,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!rel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    targetId = explicit;
  }

  const items = await prisma.medication.findMany({
    where: { patientId: targetId },
    orderBy: [{ active: "desc" }, { startDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({ items });
}

/**
 * POST /api/medications — PATIENT only (coaches/doctors shouldn't add
 * medications on behalf of the patient; they'd go through a different
 * prescription flow).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me || me.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMedicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const created = await prisma.medication.create({
    data: {
      patientId: me.id,
      name: data.name,
      dose: data.dose ?? null,
      frequency: data.frequency ?? null,
      notes: data.notes ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      active: data.active ?? true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
