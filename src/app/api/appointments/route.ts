import { NextResponse } from "next/server";
import type { ProfessionalRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createAppointment,
  listAppointments,
} from "@/lib/appointments";
import { createAppointmentSchema } from "@/lib/validators/appointment";

function roleToProfessionalRole(
  role: "DOCTOR" | "COACH",
): ProfessionalRole {
  return role;
}

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
  const qPatientId = searchParams.get("patientId") ?? undefined;

  // Patients see only their own; professionals see their own bookings.
  const filters: {
    start?: string;
    end?: string;
    patientId?: string;
    professionalId?: string;
  } = { start, end };
  if (me.role === "PATIENT") {
    filters.patientId = user.id;
  } else if (me.role === "DOCTOR" || me.role === "COACH") {
    filters.professionalId = user.id;
    if (qPatientId) filters.patientId = qPatientId;
  } else {
    if (qPatientId) filters.patientId = qPatientId;
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
  if (!me || (me.role !== "DOCTOR" && me.role !== "COACH" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const apt = await createAppointment({
    professionalId: user.id,
    patientId: parsed.data.patientId,
    professionalRole:
      me.role === "DOCTOR" || me.role === "COACH"
        ? roleToProfessionalRole(me.role)
        : parsed.data.professionalRole,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    type: parsed.data.type,
    notes: parsed.data.notes,
    meetingUrl: parsed.data.meetingUrl,
  });
  return NextResponse.json(apt, { status: 201 });
}
