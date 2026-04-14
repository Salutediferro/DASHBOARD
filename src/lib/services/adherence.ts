import { CheckInFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOW_DAYS = 14;

export type AdherenceBreakdown = {
  workout: number; // 0..1
  nutrition: number; // 0..1
  checkIn: number; // 0..1
  overall: number; // 0..1 weighted
  windowDays: number;
};

function clamp01(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Expected weekly training sessions:
 * count of WorkoutDay rows across ACTIVE templates authored by any coach for this client
 * (approximation; we don't track assigned templates → use the 2-day base seeded template as fallback).
 * Until there is a proper client↔template assignment, we assume 3 sessions/week as a healthy default.
 */
const ASSUMED_SESSIONS_PER_WEEK = 3;
const ASSUMED_MEALS_PER_DAY = 4;

function frequencyToDays(f: CheckInFrequency): number | null {
  if (f === "WEEKLY") return 7;
  if (f === "BIWEEKLY") return 14;
  if (f === "MONTHLY") return 30;
  return null;
}

export async function computeWorkoutAdherence(
  clientId: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<number> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const completed = await prisma.workoutLog.count({
    where: { clientId, completed: true, date: { gte: since } },
  });
  const expected = (windowDays / 7) * ASSUMED_SESSIONS_PER_WEEK;
  return clamp01(expected === 0 ? 0 : completed / expected);
}

export async function computeNutritionAdherence(
  clientId: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<number> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const logged = await prisma.nutritionLog.count({
    where: { clientId, loggedAt: { gte: since } },
  });
  const expected = windowDays * ASSUMED_MEALS_PER_DAY;
  return clamp01(expected === 0 ? 0 : logged / expected);
}

/**
 * Check-in adherence: in the window, count expected check-ins from the CoachClient schedule
 * and divide by the number of CheckIn rows landed on time.
 */
export async function computeCheckInAdherence(
  clientId: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<number> {
  const relations = await prisma.coachClient.findMany({
    where: { clientId, status: "ACTIVE" },
    select: { checkInFrequency: true },
  });
  const rel = relations[0];
  const cadence = rel ? frequencyToDays(rel.checkInFrequency) : null;
  if (!cadence) return 1; // no schedule → not penalizing

  const expected = Math.max(1, Math.floor(windowDays / cadence));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const done = await prisma.checkIn.count({
    where: { clientId, date: { gte: since } },
  });
  return clamp01(done / expected);
}

export async function computeAdherence(
  clientId: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<AdherenceBreakdown> {
  const [workout, nutrition, checkIn] = await Promise.all([
    computeWorkoutAdherence(clientId, windowDays),
    computeNutritionAdherence(clientId, windowDays),
    computeCheckInAdherence(clientId, windowDays),
  ]);
  const overall = workout * 0.4 + nutrition * 0.3 + checkIn * 0.3;
  return { workout, nutrition, checkIn, overall, windowDays };
}

export async function computeAdherenceForCoachClients(
  coachId: string,
  windowDays = DEFAULT_WINDOW_DAYS,
) {
  const relations = await prisma.coachClient.findMany({
    where: { coachId, status: "ACTIVE" },
    include: {
      client: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  });

  const rows = await Promise.all(
    relations.map(async (r) => ({
      clientId: r.clientId,
      fullName: r.client.fullName,
      avatarUrl: r.client.avatarUrl,
      adherence: await computeAdherence(r.clientId, windowDays),
    })),
  );

  return rows.sort((a, b) => a.adherence.overall - b.adherence.overall);
}
