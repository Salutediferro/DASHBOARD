import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  checkAppointmentAccess,
  resolveCaller,
} from "@/lib/appointments/access";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/validators/appointment";

type Ctx = { params: Promise<{ id: string }> };

function toICSDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeICS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * GET /api/appointments/[id]/ics
 *
 * Returns a single-event iCalendar file the caller can import into
 * their calendar (Apple/Google/Outlook). Access rules mirror the
 * regular appointment endpoint.
 */
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

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      type: true,
      status: true,
      notes: true,
      meetingUrl: true,
      patient: { select: { fullName: true } },
      professional: { select: { fullName: true } },
    },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const typeLabel = APPOINTMENT_TYPE_LABELS[appt.type] ?? appt.type;
  const summary = `Salute di Ferro · ${typeLabel}`;
  const descLines = [
    `Paziente: ${appt.patient?.fullName ?? "—"}`,
    `Professionista: ${appt.professional?.fullName ?? "—"}`,
    `Tipo: ${typeLabel}`,
    `Stato: ${appt.status}`,
  ];
  if (appt.notes) descLines.push(`Note: ${appt.notes}`);
  if (appt.meetingUrl) descLines.push(`Link: ${appt.meetingUrl}`);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salute di Ferro//Appointments//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appointment-${appt.id}@salutediferro.com`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(appt.startTime)}`,
    `DTEND:${toICSDate(appt.endTime)}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(descLines.join("\n"))}`,
    ...(appt.meetingUrl ? [`URL:${escapeICS(appt.meetingUrl)}`] : []),
    `STATUS:${appt.status === "CANCELED" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appuntamento-${appt.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
