import { NextResponse } from "next/server";
import type { Prisma, ProfessionalRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import {
  findConflict,
  notifyAppointment,
  resolveCaller,
} from "@/lib/appointments/access";

function serialize(a: {
  id: string;
  professionalId: string;
  patientId: string;
  professionalRole: ProfessionalRole;
  startTime: Date;
  endTime: Date;
  type: string;
  status: string;
  notes: string | null;
  meetingUrl: string | null;
  patient?: { fullName: string } | null;
  professional?: { fullName: string } | null;
}) {
  return {
    id: a.id,
    professionalId: a.professionalId,
    patientId: a.patientId,
    professionalRole: a.professionalRole,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    type: a.type,
    status: a.status,
    notes: a.notes,
    meetingUrl: a.meetingUrl,
    patientName: a.patient?.fullName ?? null,
    professionalName: a.professional?.fullName ?? null,
  };
}

const LIST_SELECT = {
  id: true,
  professionalId: true,
  patientId: true,
  professionalRole: true,
  startTime: true,
  endTime: true,
  type: true,
  status: true,
  notes: true,
  meetingUrl: true,
  patient: { select: { fullName: true } },
  professional: { select: { fullName: true } },
} as const;

/**
 * GET /api/appointments
 *
 * PATIENT: own appointments only.
 * DOCTOR/COACH: appointments where they are the professional, plus an
 *   optional ?patientId= filter for cross-patient scoping. Doctor/coach
 *   cannot see other professionals' calendars.
 * ADMIN: unrestricted.
 * Optional: ?from, ?to (ISO strings).
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
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const patientIdParam = searchParams.get("patientId");

  const where: Prisma.AppointmentWhereInput = {};
  if (me.role === "PATIENT") {
    where.patientId = me.id;
  } else if (me.role === "DOCTOR" || me.role === "COACH") {
    where.professionalId = me.id;
    if (patientIdParam) where.patientId = patientIdParam;
  } else if (me.role === "ADMIN") {
    if (patientIdParam) where.patientId = patientIdParam;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (from || to) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.startTime = range;
  }

  const rows = await prisma.appointment.findMany({
    where,
    orderBy: { startTime: "asc" },
    select: LIST_SELECT,
  });
  return NextResponse.json(rows.map(serialize));
}

/**
 * POST /api/appointments
 *
 * Creates an appointment in one of two modes:
 *   - PATIENT booking: body provides professionalId + professionalRole;
 *     server sets patientId = me.id.
 *   - DOCTOR/COACH manual creation: body provides patientId; server
 *     sets professionalId = me.id and derives professionalRole from the
 *     caller's role.
 *
 * Both modes require an ACTIVE CareRelationship with the matching
 * professionalRole. All creations run a conflict check against existing
 * non-CANCELED appointments on the same professional and write
 * Notification rows for both sides.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (me.role !== "PATIENT" && me.role !== "DOCTOR" && me.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  // Resolve both sides.
  let professionalId: string;
  let patientId: string;
  let professionalRole: ProfessionalRole;

  if (me.role === "PATIENT") {
    if (!input.professionalId || !input.professionalRole) {
      return NextResponse.json(
        { error: "professionalId e professionalRole sono obbligatori" },
        { status: 400 },
      );
    }
    professionalId = input.professionalId;
    patientId = me.id;
    professionalRole = input.professionalRole;
  } else {
    if (!input.patientId) {
      return NextResponse.json(
        { error: "patientId obbligatorio" },
        { status: 400 },
      );
    }
    professionalId = me.id;
    patientId = input.patientId;
    professionalRole = me.role as ProfessionalRole;
  }

  // Verify the care relationship exists + is active.
  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId,
      patientId,
      professionalRole,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!rel) {
    return NextResponse.json(
      {
        error:
          "Nessuna relazione di cura attiva tra il cliente e il professionista",
      },
      { status: 403 },
    );
  }

  // Compute start/end.
  const startTime = new Date(input.startTime);
  const endTime = input.endTime
    ? new Date(input.endTime)
    : new Date(startTime.getTime() + (input.durationMin ?? 30) * 60_000);
  if (endTime <= startTime) {
    return NextResponse.json(
      { error: "endTime deve essere successivo a startTime" },
      { status: 400 },
    );
  }

  // Conflict check on the same professional.
  const conflict = await findConflict({ professionalId, startTime, endTime });
  if (conflict) {
    return NextResponse.json(
      { error: "Sovrapposizione con un altro appuntamento" },
      { status: 409 },
    );
  }

  const created = await prisma.appointment.create({
    data: {
      professionalId,
      patientId,
      professionalRole,
      startTime,
      endTime,
      type: input.type,
      status: "SCHEDULED",
      notes: input.notes ?? null,
      meetingUrl: input.meetingUrl ? input.meetingUrl : null,
    },
    select: LIST_SELECT,
  });

  // Fire the paired notifications.
  await notifyAppointment({
    appointmentId: created.id,
    patientId: created.patientId,
    professionalId: created.professionalId,
    patientName: created.patient?.fullName ?? "Cliente",
    professionalName: created.professional?.fullName ?? "Professionista",
    when: created.startTime,
    action: "CREATED",
  });

  return NextResponse.json(serialize(created), { status: 201 });
}
