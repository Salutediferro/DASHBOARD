import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/admin/metrics
 *
 * Product metrics that go beyond the four KPI cards on the admin home:
 *   - Signup trend (daily count, last 30 days)
 *   - Onboarding funnel (register → onboard → first biometric → first
 *     appointment, last 30 days patient cohort)
 *   - Invite conversion (all time: created / accepted / pending /
 *     expired-or-revoked)
 *   - Active-patient % (patients with any BiometricLog / CheckIn /
 *     Appointment in the last 7d and 30d, against total active PATIENT
 *     users — active = not soft-deleted)
 *
 * Every aggregation runs in parallel and is wrapped in Promise.all. No
 * N+1: all queries are a single COUNT / GROUP BY each. Cache headers are
 * short so the admin gets a quasi-live view on manual refresh.
 */
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  try {
    await requireRole(["ADMIN"]);

    const now = new Date();
    const today = startOfDay(now);
    const days30 = new Date(today.getTime() - 29 * DAY_MS);
    const days7 = new Date(today.getTime() - 7 * DAY_MS);

    const [
      signups30d,
      cohortPatients,
      cohortOnboarded,
      cohortBiometric,
      cohortAppointment,
      invitesByStatus,
      totalActivePatients,
      activePatients7d,
      activePatients30d,
      activePatientsBiometric7d,
      activePatientsCheckIn7d,
      activePatientsAppointment7d,
    ] = await Promise.all([
      // Daily signup counts, last 30 days. Raw SQL so we get a clean
      // date_trunc grouping; Prisma's groupBy on a datetime bucket is
      // painful otherwise.
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT
          date_trunc('day', "createdAt") AS day,
          COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= ${days30}
          AND "role" = 'PATIENT'
        GROUP BY day
        ORDER BY day ASC
      `,

      // Onboarding funnel — 30-day PATIENT cohort
      prisma.user.count({
        where: { role: "PATIENT", createdAt: { gte: days30 } },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          createdAt: { gte: days30 },
          onboardingCompleted: true,
        },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          createdAt: { gte: days30 },
          biometricLogs: { some: {} },
        },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          createdAt: { gte: days30 },
          appointmentsAsPatient: { some: {} },
        },
      }),

      // Invitation funnel (all time)
      prisma.invitation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // Active patients base set
      prisma.user.count({
        where: { role: "PATIENT", deletedAt: null },
      }),

      // Any activity in last 7/30 days — union via OR clauses
      prisma.user.count({
        where: {
          role: "PATIENT",
          deletedAt: null,
          OR: [
            { biometricLogs: { some: { date: { gte: days7 } } } },
            { checkInsAsPatient: { some: { date: { gte: days7 } } } },
            { appointmentsAsPatient: { some: { startTime: { gte: days7 } } } },
          ],
        },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          deletedAt: null,
          OR: [
            { biometricLogs: { some: { date: { gte: days30 } } } },
            { checkInsAsPatient: { some: { date: { gte: days30 } } } },
            {
              appointmentsAsPatient: { some: { startTime: { gte: days30 } } },
            },
          ],
        },
      }),
      // Breakdown of the 7d activity type
      prisma.user.count({
        where: {
          role: "PATIENT",
          deletedAt: null,
          biometricLogs: { some: { date: { gte: days7 } } },
        },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          deletedAt: null,
          checkInsAsPatient: { some: { date: { gte: days7 } } },
        },
      }),
      prisma.user.count({
        where: {
          role: "PATIENT",
          deletedAt: null,
          appointmentsAsPatient: { some: { startTime: { gte: days7 } } },
        },
      }),
    ]);

    // Fill signup trend gaps with zeros so the chart never has missing
    // days.
    const trendByDay = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(days30.getTime() + i * DAY_MS);
      trendByDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of signups30d) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      trendByDay.set(key, Number(row.count));
    }
    const signupTrend = Array.from(trendByDay.entries()).map(
      ([date, count]) => ({ date, count }),
    );

    // Invite counts mapped to a stable shape
    const invites = {
      total: invitesByStatus.reduce((s, r) => s + r._count._all, 0),
      pending: invitesByStatus.find((r) => r.status === "PENDING")?._count._all ?? 0,
      accepted:
        invitesByStatus.find((r) => r.status === "ACCEPTED")?._count._all ?? 0,
      expired:
        invitesByStatus.find((r) => r.status === "EXPIRED")?._count._all ?? 0,
      revoked:
        invitesByStatus.find((r) => r.status === "REVOKED")?._count._all ?? 0,
    };
    const acceptanceRate =
      invites.total > 0 ? invites.accepted / invites.total : 0;

    return NextResponse.json({
      windowDays: 30,
      signupTrend,
      onboardingFunnel: {
        cohortTotal: cohortPatients,
        onboarded: cohortOnboarded,
        firstBiometric: cohortBiometric,
        firstAppointment: cohortAppointment,
      },
      invites: { ...invites, acceptanceRate },
      engagement: {
        totalActivePatients,
        active7d: activePatients7d,
        active30d: activePatients30d,
        breakdown7d: {
          biometric: activePatientsBiometric7d,
          checkIn: activePatientsCheckIn7d,
          appointment: activePatientsAppointment7d,
        },
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
