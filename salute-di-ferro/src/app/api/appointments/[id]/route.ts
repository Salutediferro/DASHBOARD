import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_TYPE_LABELS,
  updateAppointmentSchema,
} from "@/lib/validators/appointment";
import {
  checkAppointmentAccess,
  findConflict,
  notifyAppointment,
  resolveCaller,
} from "@/lib/appointments/access";
import { cancelMeetEvent, updateMeetEvent } from "@/lib/google/calendar";

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
  googleEventId: true,
  patient: { select: { fullName: true } },
  professional: { select: { fullName: true } },
} as const;

export async function GET(_req: Request, { params }: Ctx) {
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

  const full = await prisma.appointment.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  });
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: full.id,
    professionalId: full.professionalId,
    patientId: full.patientId,
    professionalRole: full.professionalRole,
    startTime: full.startTime.toISOString(),
    endTime: full.endTime.toISOString(),
    type: full.type,
    status: full.status,
    notes: full.notes,
    meetingUrl: full.meetingUrl,
    patientName: full.patient?.fullName ?? null,
    professionalName: full.professional?.fullName ?? null,
  });
}

/**
 * PATCH /api/appointments/[id]
 *
 * - Reschedule: owner patient or professional. Runs the conflict check
 *   against the new window.
 * - Status updates (COMPLETED/NO_SHOW): professional or admin.
 *   CANCELED should go through DELETE instead.
 */
export async function PATCH(req: Request, { params }: Ctx) {
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
  const { appointment, role } = access;

  if (role === "COURTESY") {
    return NextResponse.json(
      { error: "Read-only access" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const patch = parsed.data;

  // Compute effective window if we're rescheduling.
  let newStart = appointment.startTime;
  let newEnd = appointment.endTime;
  const hasReschedule =
    patch.startTime != null || patch.endTime != null || patch.durationMin != null;
  if (hasReschedule) {
    newStart = patch.startTime ? new Date(patch.startTime) : appointment.startTime;
    if (patch.endTime) {
      newEnd = new Date(patch.endTime);
    } else if (patch.durationMin != null) {
      newEnd = new Date(newStart.getTime() + patch.durationMin * 60_000);
    } else {
      // startTime moved; keep original duration.
      const durationMs =
        appointment.endTime.getTime() - appointment.startTime.getTime();
      newEnd = new Date(newStart.getTime() + durationMs);
    }
    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: "endTime deve essere successivo a startTime" },
        { status: 400 },
      );
    }

    const conflict = await findConflict({
      professionalId: appointment.professionalId,
      startTime: newStart,
      endTime: newEnd,
      excludeId: appointment.id,
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Sovrapposizione con un altro appuntamento" },
        { status: 409 },
      );
    }
  }

  // Status restriction: PATIENT cannot mark completed/no-show.
  if (patch.status && role === "OWNER_PATIENT") {
    return NextResponse.json(
      { error: "Il cliente non può aggiornare lo stato" },
      { status: 403 },
    );
  }
  if (patch.status === "CANCELED") {
    return NextResponse.json(
      { error: "Usa DELETE per annullare" },
      { status: 400 },
    );
  }
  // Accept/decline must go through the dedicated endpoints — they
  // upsert the CareRelationship and fire the correct notification.
  if (patch.status === "SCHEDULED" || patch.status === "PENDING") {
    return NextResponse.json(
      { error: "Usa l'endpoint dedicato per accettare/rifiutare" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (hasReschedule) {
    data.startTime = newStart;
    data.endTime = newEnd;
  }
  if (patch.type) data.type = patch.type;
  if (patch.status) data.status = patch.status;
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.meetingUrl !== undefined) {
    data.meetingUrl = patch.meetingUrl ? patch.meetingUrl : null;
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    select: DETAIL_SELECT,
  });

  if (hasReschedule || patch.status === "COMPLETED") {
    await notifyAppointment({
      appointmentId: updated.id,
      patientId: updated.patientId,
      professionalId: updated.professionalId,
      patientName: updated.patient?.fullName ?? "Cliente",
      professionalName: updated.professional?.fullName ?? "Professionista",
      when: updated.startTime,
      action: hasReschedule ? "RESCHEDULED" : "COMPLETED",
    });
  }

  // Keep the linked Google Calendar event in sync. We only have an
  // eventId if the pro had Google linked at acceptance time — otherwise
  // updateMeetEvent is a no-op. Failures are logged, not raised: the
  // appointment row is the source of truth and the patient still got
  // (and will get further) emails reflecting the new time.
  if (updated.googleEventId && (hasReschedule || patch.notes !== undefined)) {
    try {
      const patientName = updated.patient?.fullName ?? "Cliente";
      const appointmentTypeLabel =
        APPOINTMENT_TYPE_LABELS[updated.type] ?? updated.type;
      await updateMeetEvent({
        professionalUserId: updated.professionalId,
        eventId: updated.googleEventId,
        startTime: hasReschedule ? updated.startTime : undefined,
        endTime: hasReschedule ? updated.endTime : undefined,
        summary: `${appointmentTypeLabel} — ${patientName}`,
        description:
          patch.notes !== undefined
            ? [
                `Appuntamento Salute di Ferro con ${patientName}.`,
                updated.notes ? `\nNote: ${updated.notes}` : "",
              ]
                .filter(Boolean)
                .join("")
            : undefined,
      });
    } catch (e) {
      console.error("[appointment-patch] Google Calendar update failed", e);
    }
  }

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

/**
 * DELETE /api/appointments/[id]
 * Soft cancel (status=CANCELED). Owner patient or professional may call.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
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
  if (access.role === "COURTESY") {
    return NextResponse.json(
      { error: "Read-only access" },
      { status: 403 },
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
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
    action: "CANCELED",
  });

  // Delete the mirrored Google event so the pro's Calendar reflects
  // the cancellation. No-op when there's no eventId (pro hadn't linked
  // Google when the appointment was accepted) or when the pro has since
  // disconnected — cancelMeetEvent handles both paths quietly.
  if (updated.googleEventId) {
    try {
      await cancelMeetEvent({
        professionalUserId: updated.professionalId,
        eventId: updated.googleEventId,
      });
    } catch (e) {
      console.error("[appointment-delete] Google Calendar cancel failed", e);
    }
  }

  return NextResponse.json({ canceled: true });
}
