import { prisma } from "@/lib/prisma";

export type TimeBlock = { start: Date; end: Date };

/**
 * Extract the UTC hours/minutes from a @db.Time column value (Prisma
 * materializes those as Date objects anchored on 1970-01-01, but what
 * actually matters is the time-of-day part).
 */
function timeOfDay(d: Date): { h: number; m: number } {
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

/** Build a Date in local time from a day anchor + HH:mm time-of-day. */
function withTime(anchor: Date, h: number, m: number): Date {
  const d = new Date(anchor);
  d.setHours(h, m, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Compute the free slots for a professional over a date range.
 *
 * - Recurring AvailabilitySlot rows whose `dayOfWeek` matches a given
 *   day inside the range contribute a window on that day.
 * - One-off AvailabilitySlot rows whose `date` falls inside the range
 *   contribute a window on that specific day.
 * - The union of those windows is chunked into `durationMin` slots.
 * - Any Appointment that overlaps a chunk (status != CANCELED) removes
 *   that chunk from the output.
 *
 * Dates are computed in the server's local timezone; recurring dayOfWeek
 * uses JS Date.getDay() (0=Sunday..6=Saturday), matching the schema.
 */
export async function computeAvailableSlots(params: {
  professionalId: string;
  from: Date;
  to: Date;
  durationMin?: number;
}): Promise<TimeBlock[]> {
  const { professionalId, from, to } = params;
  const durationMin = params.durationMin ?? 30;

  if (to <= from) return [];

  const [slots, busy] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { professionalId },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: { not: "CANCELED" },
        startTime: { lt: to },
        endTime: { gt: from },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const windows: TimeBlock[] = [];

  // Iterate day-by-day across the range.
  const dayCursor = new Date(from);
  dayCursor.setHours(0, 0, 0, 0);
  const dayEnd = new Date(to);

  while (dayCursor < dayEnd) {
    const dow = dayCursor.getDay();
    for (const slot of slots) {
      const matchesRecurring =
        slot.isRecurring && slot.dayOfWeek === dow;
      const matchesOneOff =
        !slot.isRecurring &&
        slot.date != null &&
        sameDay(slot.date, dayCursor);
      if (!matchesRecurring && !matchesOneOff) continue;

      const start = timeOfDay(slot.startTime);
      const end = timeOfDay(slot.endTime);
      const windowStart = withTime(dayCursor, start.h, start.m);
      const windowEnd = withTime(dayCursor, end.h, end.m);

      // Clip to the requested range so the first/last day don't bleed
      // into out-of-range chunks.
      const clippedStart = windowStart < from ? from : windowStart;
      const clippedEnd = windowEnd > to ? to : windowEnd;
      if (clippedEnd > clippedStart) {
        windows.push({ start: clippedStart, end: clippedEnd });
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  // Slice every window into fixed-size chunks.
  const chunks: TimeBlock[] = [];
  for (const w of windows) {
    const cursor = new Date(w.start);
    while (cursor.getTime() + durationMin * 60_000 <= w.end.getTime()) {
      const chunkStart = new Date(cursor);
      const chunkEnd = new Date(cursor.getTime() + durationMin * 60_000);
      chunks.push({ start: chunkStart, end: chunkEnd });
      cursor.setMinutes(cursor.getMinutes() + durationMin);
    }
  }

  // Drop chunks that collide with an existing appointment.
  const free = chunks.filter((c) => {
    for (const b of busy) {
      if (c.start < b.endTime && c.end > b.startTime) return false;
    }
    return true;
  });

  free.sort((a, b) => a.start.getTime() - b.start.getTime());
  return free;
}
