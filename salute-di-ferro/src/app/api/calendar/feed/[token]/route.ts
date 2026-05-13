import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appointmentVEvent, serializeICS, toICSDate } from "@/lib/calendar/ics";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

// Window of appointments the feed exposes. Keep it bounded so the
// payload stays small and old cancellations eventually fall off.
const PAST_DAYS = 30;
const FUTURE_DAYS = 365;

/**
 * GET /api/calendar/feed/[token]
 *
 * Public iCalendar feed authorized by an opaque per-user token. The
 * user subscribes to this URL once from Google Calendar / Apple
 * Calendar / Outlook and their client polls it on its own schedule
 * (Google typically every few hours).
 *
 * Token IS the credential — no Supabase session required. The token
 * column is nullable + unique, so a missing/unknown token returns 404
 * indistinguishably from a non-existent user.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarFeedToken: token },
    select: { id: true, fullName: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - PAST_DAYS * 24 * 3600 * 1000);
  const to = new Date(now.getTime() + FUTURE_DAYS * 24 * 3600 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [{ patientId: user.id }, { professionalId: user.id }],
      startTime: { gte: from, lte: to },
    },
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
    orderBy: { startTime: "asc" },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salute di Ferro//Appointments Feed//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Salute di Ferro — ${user.fullName}`,
    "X-WR-TIMEZONE:Europe/Rome",
    "X-PUBLISHED-TTL:PT6H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    `X-WR-CALDESC:Appuntamenti generati il ${toICSDate(now)}`,
  ];
  for (const a of appointments) {
    lines.push(...appointmentVEvent(a));
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(serializeICS(lines), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Google/Apple/Outlook cache aggressively anyway, but hint a
      // short edge-cache window so reschedules propagate within minutes
      // if the client happens to revalidate.
      "Cache-Control": "private, max-age=300",
    },
  });
}
