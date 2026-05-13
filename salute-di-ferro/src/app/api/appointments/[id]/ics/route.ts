import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  checkAppointmentAccess,
  resolveCaller,
} from "@/lib/appointments/access";
import { appointmentVEvent, serializeICS } from "@/lib/calendar/ics";

type Ctx = { params: Promise<{ id: string }> };

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
      updatedAt: true,
      patient: { select: { fullName: true } },
      professional: { select: { fullName: true } },
    },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salute di Ferro//Appointments//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...appointmentVEvent(appt),
    "END:VCALENDAR",
  ];

  return new NextResponse(serializeICS(lines), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appuntamento-${appt.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
