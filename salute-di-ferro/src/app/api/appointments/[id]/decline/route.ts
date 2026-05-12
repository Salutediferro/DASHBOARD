import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  checkAppointmentAccess,
  notifyAppointment,
  resolveCaller,
} from "@/lib/appointments/access";

type Ctx = { params: Promise<{ id: string }> };

const DETAIL_SELECT = {
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
 * POST /api/appointments/[id]/decline
 *
 * The professional rejects a PENDING request. Marks the appointment
 * CANCELED — the CareRelationship is intentionally never created since
 * the pro never agreed to take this patient. Fires a REQUEST_DECLINED
 * notification with distinct wording from a plain cancellation.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await checkAppointmentAccess(me, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role !== "OWNER_PROFESSIONAL" && access.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo il professionista può rifiutare la richiesta" },
      { status: 403 },
    );
  }
  const { appointment } = access;
  if (appointment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Questa richiesta non è più in attesa" },
      { status: 409 },
    );
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELED" },
    select: DETAIL_SELECT,
  });

  await notifyAppointment({
    appointmentId: updated.id,
    patientId: updated.patientId,
    professionalId: updated.professionalId,
    patientName: updated.patient?.fullName ?? "Cliente",
    professionalName: updated.professional?.fullName ?? "Professionista",
    when: updated.startTime,
    action: "REQUEST_DECLINED",
  });

  return NextResponse.json({ declined: true });
}
