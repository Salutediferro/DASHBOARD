import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_WINDOWS = [30, 90, 365] as const;

/**
 * GET /api/biometrics/summary?patientId=...&days=30|90|365
 *
 * Returns the time series for the chosen window plus per-metric first/last/
 * min/max/avg stats. Access rules mirror /api/biometrics: patient sees their
 * own data, doctor/coach need an active CareRelationship, admin unrestricted.
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

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("patientId");

  let patientId: string;
  if (me.role === "PATIENT") {
    if (requested && requested !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    patientId = me.id;
  } else if (me.role === "DOCTOR" || me.role === "COACH") {
    if (!requested) {
      return NextResponse.json({ error: "patientId required" }, { status: 400 });
    }
    const rel = await prisma.careRelationship.findFirst({
      where: { professionalId: me.id, patientId: requested, status: "ACTIVE" },
      select: { id: true },
    });
    if (!rel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    patientId = requested;
  } else if (me.role === "ADMIN") {
    if (!requested) {
      return NextResponse.json({ error: "patientId required" }, { status: 400 });
    }
    patientId = requested;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const daysParam = Number(searchParams.get("days") ?? "30");
  const days = ALLOWED_WINDOWS.includes(daysParam as 30 | 90 | 365)
    ? (daysParam as 30 | 90 | 365)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.biometricLog.findMany({
    where: { patientId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  type Row = (typeof rows)[number];
  const pick = (r: Row, k: keyof Row) => {
    const v = r[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const METRICS = [
    "weight",
    "bmi",
    "bodyFatPercentage",
    "muscleMassKg",
    "waistCm",
    "systolicBP",
    "diastolicBP",
    "restingHR",
    "spo2",
    "glucoseFasting",
    "sleepHours",
    "steps",
  ] as const;

  const stats: Record<
    string,
    {
      first: number | null;
      last: number | null;
      min: number | null;
      max: number | null;
      avg: number | null;
      count: number;
    }
  > = {};

  for (const m of METRICS) {
    const values: number[] = [];
    for (const r of rows) {
      const v = pick(r, m as keyof Row);
      if (v != null) values.push(v);
    }
    stats[m] = {
      first: values[0] ?? null,
      last: values[values.length - 1] ?? null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      avg: values.length
        ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
        : null,
      count: values.length,
    };
  }

  const series = rows.map((r) => ({
    date: r.date.toISOString(),
    weight: r.weight,
    bmi: r.bmi,
    systolicBP: r.systolicBP,
    diastolicBP: r.diastolicBP,
    restingHR: r.restingHR,
    spo2: r.spo2,
    glucoseFasting: r.glucoseFasting,
    sleepHours: r.sleepHours,
    steps: r.steps,
  }));

  return NextResponse.json({ days, patientId, stats, series });
}
