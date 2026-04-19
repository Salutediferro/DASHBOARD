import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { upsertSymptomLogSchema } from "@/lib/validators/symptom";

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * GET /api/symptom-logs
 *
 * Returns the caller patient's last N daily symptom entries. DOCTOR/
 * COACH/ADMIN can pass `?patientId=` and read if they have an ACTIVE
 * CareRelationship (admin unrestricted).
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

  const items = await prisma.symptomLog.findMany({
    where: { patientId: targetId },
    orderBy: { date: "desc" },
    take: 60,
  });
  return NextResponse.json({ items });
}

/**
 * POST /api/symptom-logs — PATIENT upsert for a specific day. If a log
 * for the same (patient, date) already exists, it's overwritten so the
 * user can edit today's entry without a separate PATCH flow.
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
  const parsed = upsertSymptomLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const dateStr = parsed.data.date ?? todayIsoDate();
  const date = new Date(dateStr);

  const upserted = await prisma.symptomLog.upsert({
    where: { patientId_date: { patientId: me.id, date } },
    create: {
      patientId: me.id,
      date,
      mood: parsed.data.mood ?? null,
      energy: parsed.data.energy ?? null,
      sleepQuality: parsed.data.sleepQuality ?? null,
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes ?? null,
    },
    update: {
      mood: parsed.data.mood ?? null,
      energy: parsed.data.energy ?? null,
      sleepQuality: parsed.data.sleepQuality ?? null,
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(upserted);
}
