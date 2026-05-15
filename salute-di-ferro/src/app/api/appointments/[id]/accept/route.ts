import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  checkAppointmentAccess,
  notifyAppointment,
  resolveCaller,
} from "@/lib/appointments/access";
import { createMeetEvent } from "@/lib/google/calendar";
import { sendEmail } from "@/lib/email/send";
import {
  appointmentAcceptedEmail,
  appointmentAcceptedProEmail,
} from "@/lib/email/templates";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

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
  patient: { select: { fullName: true, email: true } },
  professional: { select: { fullName: true, email: true } },
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
 *
 * After the transaction:
 *   3. If the pro has linked their Google account, creates a Calendar
 *      event with a Meet link and stores both `meetingUrl` and
 *      `googleEventId` back on the appointment. Failures here don't
 *      roll back the acceptance — the appointment stands either way.
 *   4. Emails the patient (acceptance confirmation, with Meet link if
 *      we have one). When Google isn't linked, also emails the pro a
 *      nudge to connect.
 *   5. Fires the in-app REQUEST_ACCEPTED notification.
 */
export async function POST(req: Request, { params }: Ctx) {
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

  // Try to mint a Google Meet link via the pro's Calendar. Failures
  // here are logged but never fail the acceptance — the user already
  // sees the request accepted in the UI by the time we run this block.
  const appointmentTypeLabel =
    APPOINTMENT_TYPE_LABELS[updated.type] ?? updated.type;
  const patientName = updated.patient?.fullName ?? "Cliente";
  const professionalName = updated.professional?.fullName ?? "Professionista";

  let meetingUrl: string | null = updated.meetingUrl;
  let googleEventId: string | null = updated.googleEventId;
  try {
    const meet = await createMeetEvent({
      professionalUserId: updated.professionalId,
      appointmentId: updated.id,
      startTime: updated.startTime,
      endTime: updated.endTime,
      summary: `${appointmentTypeLabel} — ${patientName}`,
      description: [
        `Appuntamento Salute di Ferro con ${patientName}.`,
        updated.notes ? `\nNote: ${updated.notes}` : "",
      ]
        .filter(Boolean)
        .join(""),
      patientEmail: updated.patient?.email ?? null,
      patientName,
    });
    if (meet) {
      meetingUrl = meet.hangoutLink ?? updated.meetingUrl;
      googleEventId = meet.eventId;
      // Persist whatever Google gave us so reschedules/cancels can
      // patch the same event later.
      await prisma.appointment.update({
        where: { id: updated.id },
        data: {
          meetingUrl: meetingUrl,
          googleEventId: meet.eventId,
        },
      });
    }
  } catch (e) {
    console.error("[appointment-accept] Google Calendar create failed", e);
  }

  // Email patient + (only if no Google linkage) the pro.
  const origin = new URL(req.url).origin;
  if (updated.patient?.email) {
    void sendEmail({
      to: updated.patient.email,
      ...appointmentAcceptedEmail({
        patientName,
        professionalName,
        appointmentStart: updated.startTime,
        appointmentType: appointmentTypeLabel,
        meetingUrl,
        notes: updated.notes,
        appUrl: origin,
      }),
      tags: [
        { name: "type", value: "appointment-accepted" },
        { name: "appointmentId", value: updated.id },
      ],
    }).catch((e) => {
      console.error("[appointment-accept] patient email failed", e);
    });
  }
  if (!googleEventId && updated.professional?.email) {
    // Pro hasn't linked Google — send the nudge email so they can fix
    // this for next time.
    void sendEmail({
      to: updated.professional.email,
      ...appointmentAcceptedProEmail({
        professionalName,
        patientName,
        appointmentStart: updated.startTime,
        appointmentType: appointmentTypeLabel,
        notes: updated.notes,
        connectGoogleUrl: `${origin}/api/google/oauth/start`,
      }),
      tags: [
        { name: "type", value: "appointment-accepted-pro" },
        { name: "appointmentId", value: updated.id },
      ],
    }).catch((e) => {
      console.error("[appointment-accept] pro email failed", e);
    });
  }

  await notifyAppointment({
    appointmentId: updated.id,
    patientId: updated.patientId,
    professionalId: updated.professionalId,
    patientName,
    professionalName,
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
    meetingUrl,
    patientName,
    professionalName,
  });
}
