import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createAvailabilitySlotSchema } from "@/lib/validators/availability";
import { resolveCaller } from "@/lib/appointments/access";
import { computeAvailableSlots } from "@/lib/appointments/slots";

/**
 * Materialize an HH:mm string onto a fixed epoch day so Prisma can
 * store it into a @db.Time column. The date part is thrown away by the
 * driver; only the time-of-day is persisted.
 */
function hhmmEpoch(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

/**
 * GET /api/availability
 *
 * Two modes:
 *   1. ?slots=1&professionalId=X&from=ISO&to=ISO  → compute the free
 *      time blocks (durationMin optional, default 30). Anyone
 *      authenticated may read this (patients need it to book).
 *   2. no `slots` param → list the raw AvailabilitySlot rows for the
 *      caller professional (or ?professionalId= if admin).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const wantsSlots = searchParams.get("slots") === "1";

  if (wantsSlots) {
    const professionalId = searchParams.get("professionalId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!professionalId || !from || !to) {
      return NextResponse.json(
        { error: "professionalId, from, to required" },
        { status: 400 },
      );
    }
    const durationMin = Number(searchParams.get("durationMin") ?? "30");

    // Patients can only request slots for a professional they have an
    // active CareRelationship with. Professionals / admin unrestricted.
    if (me.role === "PATIENT") {
      const rel = await prisma.careRelationship.findFirst({
        where: {
          professionalId,
          patientId: me.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!rel) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const blocks = await computeAvailableSlots({
      professionalId,
      from: new Date(from),
      to: new Date(to),
      durationMin,
    });
    return NextResponse.json(
      blocks.map((b) => ({
        start: b.start.toISOString(),
        end: b.end.toISOString(),
      })),
    );
  }

  // List raw slots.
  let professionalId: string;
  if (me.role === "DOCTOR" || me.role === "COACH") {
    professionalId = me.id;
  } else if (me.role === "ADMIN") {
    const q = searchParams.get("professionalId");
    if (!q) {
      return NextResponse.json(
        { error: "professionalId required" },
        { status: 400 },
      );
    }
    professionalId = q;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.availabilitySlot.findMany({
    where: { professionalId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      date: r.date ? r.date.toISOString().slice(0, 10) : null,
      startTime: `${String(r.startTime.getUTCHours()).padStart(2, "0")}:${String(r.startTime.getUTCMinutes()).padStart(2, "0")}`,
      endTime: `${String(r.endTime.getUTCHours()).padStart(2, "0")}:${String(r.endTime.getUTCMinutes()).padStart(2, "0")}`,
      isRecurring: r.isRecurring,
    })),
  );
}

/**
 * POST /api/availability
 * Create a slot (recurring or one-off). DOCTOR / COACH only.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me || (me.role !== "DOCTOR" && me.role !== "COACH")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAvailabilitySlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { dayOfWeek, date, startTime, endTime } = parsed.data;
  const isRecurring = dayOfWeek != null;

  const created = await prisma.availabilitySlot.create({
    data: {
      professionalId: me.id,
      dayOfWeek: dayOfWeek ?? null,
      date: date ? new Date(date) : null,
      startTime: hhmmEpoch(startTime),
      endTime: hhmmEpoch(endTime),
      isRecurring,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      dayOfWeek: created.dayOfWeek,
      date: created.date ? created.date.toISOString().slice(0, 10) : null,
      startTime,
      endTime,
      isRecurring: created.isRecurring,
    },
    { status: 201 },
  );
}
