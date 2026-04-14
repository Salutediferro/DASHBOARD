import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachId } from "@/lib/auth/require-client";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const coachId = await requireCoachId(req);
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_MS);
  const twoWeeksAgo = new Date(now.getTime() - 2 * WEEK_MS);

  const relations = await prisma.coachClient.findMany({
    where: { coachId, status: "ACTIVE" },
    include: { client: { select: { id: true, fullName: true } } },
  });
  const clientIds = relations.map((r) => r.clientId);

  // Activity: sessions completed per client this week.
  const logs = await prisma.workoutLog.groupBy({
    by: ["clientId"],
    where: {
      clientId: { in: clientIds },
      completed: true,
      date: { gte: weekAgo, lte: now },
    },
    _count: { _all: true },
  });
  const countsById = new Map(logs.map((l) => [l.clientId, l._count._all]));

  const activity = relations
    .map((r) => ({
      clientId: r.clientId,
      fullName: r.client.fullName,
      sessions: countsById.get(r.clientId) ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const mostActive = activity.slice(0, 5);
  const leastActive = [...activity].reverse().slice(0, 5);

  // Check-ins.
  const checkInsDone = await prisma.checkIn.count({
    where: { coachId, date: { gte: weekAgo, lte: now } },
  });
  const pendingCheckIns = await prisma.coachClient.count({
    where: {
      coachId,
      status: "ACTIVE",
      checkInFrequency: { not: "NONE" },
      nextCheckInAt: { lte: now },
      checkInReminderStage: { gt: 0 },
    },
  });

  // Approx PRs: for each client, max weight set this week vs previous week.
  const thisWeekMax = await prisma.workoutSetLog.groupBy({
    by: ["exerciseId", "workoutLogId"],
    where: {
      workoutLog: { clientId: { in: clientIds }, date: { gte: weekAgo, lte: now } },
    },
    _max: { weight: true },
  });
  const prevWeekMax = await prisma.workoutSetLog.groupBy({
    by: ["exerciseId"],
    where: {
      workoutLog: {
        clientId: { in: clientIds },
        date: { gte: twoWeeksAgo, lt: weekAgo },
      },
    },
    _max: { weight: true },
  });
  const prevById = new Map(prevWeekMax.map((r) => [r.exerciseId, r._max.weight ?? 0]));

  // Count sessions this week where max > prev max (rough PR proxy).
  let prsCount = 0;
  for (const row of thisWeekMax) {
    const prev = prevById.get(row.exerciseId) ?? 0;
    if ((row._max.weight ?? 0) > prev && prev > 0) prsCount += 1;
  }

  return NextResponse.json({
    windowFrom: weekAgo.toISOString(),
    windowTo: now.toISOString(),
    mostActive,
    leastActive,
    checkInsDone,
    pendingCheckIns,
    prsCount,
    revenue: null, // placeholder until Stripe is configured
  });
}
