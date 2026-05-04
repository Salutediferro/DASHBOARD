import { NextResponse } from "next/server";
import { Prisma, type DayOfWeek } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { therapyReminderEmail } from "@/lib/email/templates";
import { getFeatureFlag } from "@/lib/feature-flags";

/**
 * GET /api/cron/therapy-reminders
 *
 * Server-side scheduler for SELF supplement reminders. Designed to be
 * called every 5 minutes by Vercel Cron (`*\/5 * * * *`). Each invocation:
 *
 *   1. Computes a [now-window, now] window in UTC.
 *   2. Loads every active SELF item that has a reminder enabled.
 *   3. For each item, resolves the patient's local "today" using
 *      `User.timezone`, checks the weekday is in `daysOfWeek`, and
 *      computes the UTC instant of the patient's HH:MM today.
 *   4. If that instant falls in the window AND the patient is in the
 *      item's [startDate, endDate] range, attempts to claim a slot in
 *      `TherapyReminderDelivery` with INSERT … ON CONFLICT DO NOTHING.
 *   5. If the claim succeeds, sends the email; updates the row with
 *      provider id / failure on completion.
 *
 * Idempotency anchor: `(itemId, date, channel)` UNIQUE — concurrent
 * cron runs, redeploys, and retries can never double-fire the same
 * reminder for a given patient-day.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}`.
 *
 * IMPORTANT: `*\/5 * * * *` requires the Vercel Pro plan. On Hobby
 * (daily-only crons) this endpoint still works correctly but at coarser
 * resolution — change `WINDOW_MINUTES` accordingly if you adjust the
 * cron cadence in `vercel.json`.
 */

export const dynamic = "force-dynamic";

// Width of the "due now" window in minutes. Must be ≥ the cron cadence,
// otherwise reminders that fall between two ticks slip through. Set
// slightly larger than the cron interval to absorb cold-start jitter.
const WINDOW_MINUTES = 6;

type LocalParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  weekday: DayOfWeek;
};

/** Decompose `instant` into the user's local Y/M/D + weekday. */
function localPartsAt(instant: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const wd = get("weekday").toUpperCase();
  // Intl returns "Mon", "Tue", etc — map to enum.
  const wdMap: Record<string, DayOfWeek> = {
    MON: "MON",
    TUE: "TUE",
    WED: "WED",
    THU: "THU",
    FRI: "FRI",
    SAT: "SAT",
    SUN: "SUN",
  };
  return { year, month, day, weekday: wdMap[wd] ?? "MON" };
}

/**
 * Compute the UTC instant corresponding to `local.year-month-day` at
 * `hh:mm` in `timeZone`. We do this without a third-party TZ lib by
 * formatting a candidate UTC instant in the target zone and adjusting
 * by the diff (handles all DST transitions correctly).
 */
function utcInstantForLocalTime(
  local: { year: number; month: number; day: number },
  hh: number,
  mm: number,
  timeZone: string,
): Date {
  // First pass: pretend the wall-clock is UTC.
  const naive = new Date(Date.UTC(local.year, local.month - 1, local.day, hh, mm, 0));
  // Format that instant in the target zone; the diff between what we
  // wanted and what came out is the zone offset at that wall clock.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(naive);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const seenLocalMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), 0);
  const offset = seenLocalMs - naive.getTime();
  return new Date(naive.getTime() - offset);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Kill-switch shared with the appointment reminders cron. If you want
  // to disable just this one without touching appointments, add a
  // dedicated flag (e.g. `therapy-reminders-enabled`).
  const enabled = await getFeatureFlag("email-reminders-enabled");
  if (!enabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "email-reminders-enabled flag is OFF",
    });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60_000);
  const origin = new URL(req.url).origin;

  // Pull every candidate in one shot. The filter is intentionally
  // wide — final timezone math happens per-row in JS. At the project's
  // current scale (low thousands of items) this is fine; at 10k+ items
  // we'd want a generated `nextFireAt` column to range-scan instead.
  const candidates = await prisma.therapyItem.findMany({
    where: {
      kind: "SELF",
      active: true,
      reminderEnabled: true,
      reminderTime: { not: null },
      // Active range gating — safe to filter at the DB layer because
      // both columns are stored as @db.Date (no TZ ambiguity).
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      patient: { deletedAt: null },
    },
    select: {
      id: true,
      reminderTime: true,
      daysOfWeek: true,
      patient: {
        select: { id: true, email: true, fullName: true, firstName: true, timezone: true },
      },
    },
  });

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of candidates) {
    if (!item.reminderTime) continue;
    const tz = item.patient.timezone || "Europe/Rome";

    // `reminderTime` is a Postgres TIME stored at the 1970-01-01 UTC
    // anchor — read the wall-clock parts via the UTC accessors.
    const hh = item.reminderTime.getUTCHours();
    const mm = item.reminderTime.getUTCMinutes();

    const local = localPartsAt(now, tz);

    // Schedule check: weekday in user's daysOfWeek (empty = every day).
    const scheduledToday =
      item.daysOfWeek.length === 0 || item.daysOfWeek.includes(local.weekday);
    if (!scheduledToday) continue;

    const fireAt = utcInstantForLocalTime(local, hh, mm, tz);
    const dueNow = fireAt >= windowStart && fireAt <= now;
    if (!dueNow) continue;

    attempted++;

    // Idempotency claim: insert the delivery row first; the unique
    // (itemId, date, channel) index turns concurrent claims into
    // P2002 errors that we treat as "someone else handled this".
    // The `date` is the user's local calendar day, not the UTC date.
    const localDate = new Date(`${local.year}-${pad(local.month)}-${pad(local.day)}T00:00:00.000Z`);

    let claimedId: string | null = null;
    try {
      const created = await prisma.therapyReminderDelivery.create({
        data: {
          itemId: item.id,
          patientId: item.patient.id,
          date: localDate,
          channel: "EMAIL",
          status: "SENT",
          provider: "resend",
        },
        select: { id: true },
      });
      claimedId = created.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        skipped++;
        continue;
      }
      throw err;
    }

    // Build the deep link. We pass only the item id — the dashboard
    // resolves the rest server-side after the auth cookie check, so
    // this URL leaks no medical information even if intercepted.
    const deepLinkUrl = `${origin}/dashboard/patient/supplementi?reminder=${item.id}`;
    const timeLabel = `${pad(hh)}:${pad(mm)}`;

    const result = await sendEmail({
      to: item.patient.email,
      ...therapyReminderEmail({
        recipientName: item.patient.firstName ?? item.patient.fullName,
        timeLabel,
        deepLinkUrl,
      }),
      tags: [
        { name: "type", value: "therapy-reminder" },
        // We tag the item id at the provider level so failures are
        // traceable from Resend's dashboard back to a specific
        // (itemId, date) without us having to log medical data.
        { name: "item", value: item.id },
        { name: "delivery", value: claimedId },
      ],
    });

    if (result.ok) {
      sent++;
      // Best-effort: backfill the provider message id for traceability.
      const providerId = "id" in result ? result.id : null;
      if (providerId) {
        await prisma.therapyReminderDelivery
          .update({ where: { id: claimedId }, data: { providerId } })
          .catch(() => {
            // non-fatal: row already says SENT, providerId is just a nicety.
          });
      }
    } else {
      failed++;
      await prisma.therapyReminderDelivery.update({
        where: { id: claimedId },
        data: { status: "FAILED", error: result.error?.slice(0, 500) ?? "send failed" },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    windowMinutes: WINDOW_MINUTES,
    candidates: candidates.length,
    attempted,
    sent,
    skipped,
    failed,
  });
}
