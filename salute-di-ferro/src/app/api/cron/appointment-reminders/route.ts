import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { appointmentReminderEmail } from "@/lib/email/templates";

/**
 * GET /api/cron/appointment-reminders
 *
 * Runs hourly on Vercel Cron. Sends two reminders per appointment:
 *   - 24h before (caught in one of the 24h+[-0h,+1h] hourly windows)
 *   - 1h  before (caught in one of the 1h+[-0h,+1h] hourly windows)
 *
 * Windowing is time-indexed with a small overlap to survive cron jitter
 * and one-off missed runs. Duplicates are prevented by the "sent markers"
 * column on Appointment — we set reminder24SentAt / reminder1SentAt as
 * boolean timestamps so subsequent runs skip already-notified rows.
 *
 * Auth: protected by a shared secret in the Authorization header
 * (CRON_SECRET). Vercel Cron automatically sends
 * `Authorization: Bearer <secret>` when CRON_SECRET is set in the env.
 */
export const dynamic = "force-dynamic";

async function sendReminderBatch(options: {
  windowStart: Date;
  windowEnd: Date;
  /** Which marker column on Appointment to check/update. */
  marker: "reminder24SentAt" | "reminder1SentAt";
  hoursUntil: number;
  appUrl: string;
}) {
  const appts = await prisma.appointment.findMany({
    where: {
      startTime: { gte: options.windowStart, lt: options.windowEnd },
      status: "SCHEDULED",
      [options.marker]: null,
    },
    select: {
      id: true,
      startTime: true,
      type: true,
      meetingUrl: true,
      patient: { select: { id: true, email: true, fullName: true } },
      professional: {
        select: { id: true, email: true, fullName: true, role: true },
      },
    },
  });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const a of appts) {
    // Email both sides. We log failures but don't abort the batch.
    const bothResults = await Promise.all([
      sendEmail({
        to: a.patient.email,
        ...appointmentReminderEmail({
          recipientName: a.patient.fullName,
          recipientRole: "PATIENT",
          counterpartName: a.professional.fullName,
          appointmentStart: a.startTime,
          appointmentType: a.type,
          hoursUntil: options.hoursUntil,
          meetingUrl: a.meetingUrl,
          appUrl: options.appUrl,
        }),
        tags: [
          { name: "type", value: "appointment-reminder" },
          { name: "hours", value: String(options.hoursUntil) },
          { name: "side", value: "patient" },
        ],
      }),
      sendEmail({
        to: a.professional.email,
        ...appointmentReminderEmail({
          recipientName: a.professional.fullName,
          recipientRole: a.professional.role === "DOCTOR" ? "DOCTOR" : "COACH",
          counterpartName: a.patient.fullName,
          appointmentStart: a.startTime,
          appointmentType: a.type,
          hoursUntil: options.hoursUntil,
          meetingUrl: a.meetingUrl,
          appUrl: options.appUrl,
        }),
        tags: [
          { name: "type", value: "appointment-reminder" },
          { name: "hours", value: String(options.hoursUntil) },
          { name: "side", value: "professional" },
        ],
      }),
    ]);

    const anyFailed = bothResults.some((r) => !r.ok);
    // Mark as sent even on partial failure — we'd rather skip a retry
    // than flood the good recipient with duplicates.
    await prisma.appointment.update({
      where: { id: a.id },
      data: { [options.marker]: new Date() },
    });
    results.push({
      id: a.id,
      ok: !anyFailed,
      error: anyFailed
        ? bothResults
            .filter((r) => !r.ok)
            .map((r) => (r.ok ? "" : r.error))
            .join("; ")
        : undefined,
    });
  }

  return results;
}

export async function GET(req: Request) {
  // Protect against open invocation. Vercel Cron sets this header from
  // the CRON_SECRET env var automatically.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const origin = new URL(req.url).origin;
  // Hourly windows, +/- 30 min overlap to survive scheduling jitter.
  const window = (offsetMs: number, halfWidthMs = 30 * 60_000) => ({
    windowStart: new Date(now + offsetMs - halfWidthMs),
    windowEnd: new Date(now + offsetMs + halfWidthMs),
  });

  const [r24, r1] = await Promise.all([
    sendReminderBatch({
      ...window(24 * 60 * 60_000),
      marker: "reminder24SentAt",
      hoursUntil: 24,
      appUrl: origin,
    }),
    sendReminderBatch({
      ...window(1 * 60 * 60_000),
      marker: "reminder1SentAt",
      hoursUntil: 1,
      appUrl: origin,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    remind24: { count: r24.length, failed: r24.filter((r) => !r.ok).length },
    remind1: { count: r1.length, failed: r1.filter((r) => !r.ok).length },
  });
}
