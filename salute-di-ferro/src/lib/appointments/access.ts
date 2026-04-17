import type { Appointment, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Caller = Pick<User, "id" | "role">;

export async function resolveCaller(
  supabaseUserId: string,
): Promise<Caller | null> {
  const me = await prisma.user.findUnique({
    where: { id: supabaseUserId },
    select: { id: true, role: true },
  });
  return me ?? null;
}

/**
 * Who can touch an Appointment.
 *   - PATIENT owner: read/reschedule/cancel own
 *   - DOCTOR/COACH who is `professionalId`: read/edit/cancel
 *   - DOCTOR/COACH with ACTIVE CareRelationship on the patient but NOT
 *     the owning professional: read only (courtesy view)
 *   - ADMIN: unrestricted
 */
export async function checkAppointmentAccess(
  caller: Caller,
  appointmentId: string,
): Promise<
  | {
      ok: true;
      appointment: Appointment;
      role: "OWNER_PATIENT" | "OWNER_PROFESSIONAL" | "COURTESY" | "ADMIN";
    }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) return { ok: false, status: 404, error: "Not found" };

  if (appointment.patientId === caller.id) {
    return { ok: true, appointment, role: "OWNER_PATIENT" };
  }
  if (appointment.professionalId === caller.id) {
    return { ok: true, appointment, role: "OWNER_PROFESSIONAL" };
  }
  if (caller.role === "ADMIN") {
    return { ok: true, appointment, role: "ADMIN" };
  }
  if (caller.role !== "DOCTOR" && caller.role !== "COACH") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId: caller.id,
      patientId: appointment.patientId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!rel) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, appointment, role: "COURTESY" };
}

/**
 * Returns a conflicting appointment on the same professional, or null
 * if the window is free. Ignores CANCELED rows.
 */
export async function findConflict(params: {
  professionalId: string;
  startTime: Date;
  endTime: Date;
  excludeId?: string;
}): Promise<Appointment | null> {
  const { professionalId, startTime, endTime, excludeId } = params;
  return prisma.appointment.findFirst({
    where: {
      professionalId,
      status: { not: "CANCELED" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // classic overlap predicate: a.start < b.end AND a.end > b.start
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
}

/**
 * Create Notification rows for both sides of an appointment change.
 * Uses prisma directly; callers should invoke inside their own request
 * handler after the appointment row has been created/updated/canceled.
 */
export async function notifyAppointment(params: {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  patientName: string;
  professionalName: string;
  when: Date;
  action: "CREATED" | "RESCHEDULED" | "CANCELED" | "COMPLETED";
}) {
  const whenFmt = params.when.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titleFor: Record<typeof params.action, string> = {
    CREATED: "Nuovo appuntamento",
    RESCHEDULED: "Appuntamento riprogrammato",
    CANCELED: "Appuntamento annullato",
    COMPLETED: "Appuntamento completato",
  };

  const body = {
    patient: `${titleFor[params.action].toLowerCase()} con ${params.professionalName} — ${whenFmt}`,
    professional: `${titleFor[params.action].toLowerCase()} con ${params.patientName} — ${whenFmt}`,
  };

  const patientHref = `/dashboard/patient/appointments`;
  const professionalHref = `/dashboard/doctor/calendar`; // approximate — doctor/coach both land here

  await prisma.notification.createMany({
    data: [
      {
        userId: params.patientId,
        type: "REMINDER",
        title: titleFor[params.action],
        body: body.patient,
        actionUrl: patientHref,
      },
      {
        userId: params.professionalId,
        type: "REMINDER",
        title: titleFor[params.action],
        body: body.professional,
        actionUrl: professionalHref,
      },
    ],
  });
}
