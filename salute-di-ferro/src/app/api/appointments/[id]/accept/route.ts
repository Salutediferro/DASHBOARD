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
 * POST /api/appointments/[id]/accept
 *
 * The professional accepts a PENDING request. In one transaction:
 *   1. Upserts the CareRelationship to ACTIVE (reactivating if
 *      previously paused/archived). This is the *only* place a patient
 *      booking enrolls them into the pro's roster — POST /api/appointments
 *      no longer does it.
 *   2. Flips the appointment to SCHEDULED.
 * Fires a REQUEST_ACCEPTED notification to both sides.
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
      { error: "Solo il professionista può accettare la richiesta" },
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

  const updated = await prisma.$transaction(async (tx) => {
    await tx.careRelationship.upsert({
      where: {
        professionalId_patientId_professionalRole: {
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          professionalRole: appointment.professionalRole,
        },
      },
      update: {
        status: "ACTIVE",
        startDate: new Date(),
        endDate: null,
      },
      create: {
        professionalId: appointment.professionalId,
        patientId: appointment.patientId,
        professionalRole: appointment.professionalRole,
        status: "ACTIVE",
      },
    });
    return tx.appointment.update({
      where: { id: appointment.id },
      data: { status: "SCHEDULED" },
      select: DETAIL_SELECT,
    });
  });

  await notifyAppointment({
    appointmentId: updated.id,
    patientId: updated.patientId,
    professionalId: updated.professionalId,
    patientName: updated.patient?.fullName ?? "Cliente",
    professionalName: updated.professional?.fullName ?? "Professionista",
    when: updated.startTime,
    action: "REQUEST_ACCEPTED",
  });

  return NextResponse.json({
    id: updated.id,
    professionalId: updated.professionalId,
    patientId: updated.patientId,
    professionalRole: updated.professionalRole,
    startTime: updated.startTime.toISOString(),
    endTime: updated.endTime.toISOString(),
    type: updated.type,
    status: updated.status,
    notes: updated.notes,
    meetingUrl: updated.meetingUrl,
    patientName: updated.patient?.fullName ?? null,
    professionalName: updated.professional?.fullName ?? null,
  });
}
