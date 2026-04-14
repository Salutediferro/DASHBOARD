import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createAppointment,
  listAppointments,
} from "@/lib/appointments";
import { createAppointmentSchema } from "@/lib/validators/appointment";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;
  const qClientId = searchParams.get("clientId") ?? undefined;

  // Clients can only see their own; coaches see their own bookings
  const filters: { start?: string; end?: string; clientId?: string; coachId?: string } = {
    start,
    end,
  };
  if (me.role === "PATIENT") {
    filters.clientId = user.id;
  } else if (me.role === "COACH") {
    filters.coachId = user.id;
    if (qClientId) filters.clientId = qClientId;
  } else {
    if (qClientId) filters.clientId = qClientId;
  }

  return NextResponse.json(await listAppointments(filters));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!me || me.role === "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const apt = await createAppointment({
    coachId: user.id,
    clientId: parsed.data.clientId,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    type: parsed.data.type,
    notes: parsed.data.notes,
    meetingUrl: parsed.data.meetingUrl,
  });
  return NextResponse.json(apt, { status: 201 });
}
