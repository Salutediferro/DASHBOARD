import "server-only";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

import type {
  AppointmentSummary,
  BiometricsSummary,
  CheckInSummary,
  NotificationSummary,
  ReportSummary,
  SubscriptionSummary,
  TeamSummary,
  TherapyAdherenceItem,
  Trend,
  UserProfileSummary,
} from "./types";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Whole days between `from` and now (positive when from is in the past). */
function daysBetween(from: Date, to: Date = new Date()): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function trendFromDelta(
  delta: number,
  flatThreshold: number,
  invert = false,
): Trend {
  if (Math.abs(delta) < flatThreshold) return "flat";
  if (invert) return delta > 0 ? "down" : "up";
  return delta > 0 ? "up" : "down";
}

function ageFromBirthDate(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

/**
 * Profile completeness heuristic. We can't import the
 * client-only `profile-completeness.ts` here (it pulls a "use client"
 * dependency), so we compute a tiny server-side estimate aligned with
 * the briefing's persona logic.
 *
 *   onboarded ? 70 : 30
 *   + 5 per non-empty clinical field (medicalConditions / allergies /
 *     medications / injuries)
 *   + 5 if heightCm + targetWeightKg present
 *   + 5 if phone or emergencyContact set
 *   capped at 100
 */
function estimateCompleteness(u: {
  onboardingCompleted: boolean;
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  injuries: string | null;
  heightCm: number | null;
  targetWeightKg: number | null;
  phone: string | null;
  emergencyContact: string | null;
}): number {
  let base = u.onboardingCompleted ? 70 : 30;
  for (const v of [
    u.medicalConditions,
    u.allergies,
    u.medications,
    u.injuries,
  ]) {
    if (v && v.trim() !== "") base += 5;
  }
  if (u.heightCm && u.targetWeightKg) base += 5;
  if ((u.phone && u.phone.trim() !== "") || (u.emergencyContact && u.emergencyContact.trim() !== "")) {
    base += 5;
  }
  return Math.min(100, base);
}

// ---------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------

export async function getUserProfile(
  userId: string,
): Promise<UserProfileSummary | null> {

  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        fullName: true,
        role: true,
        sex: true,
        birthDate: true,
        heightCm: true,
        targetWeightKg: true,
        onboardingCompleted: true,
        medicalConditions: true,
        allergies: true,
        medications: true,
        injuries: true,
        phone: true,
        emergencyContact: true,
        createdAt: true,
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      firstName: u.firstName ?? u.fullName.split(" ")[0] ?? "",
      fullName: u.fullName,
      role: u.role,
      completeness: estimateCompleteness(u),
      daysActive: daysBetween(u.createdAt),
      onboardingCompleted: u.onboardingCompleted,
      sex: u.sex,
      ageYears: ageFromBirthDate(u.birthDate),
      heightCm: u.heightCm,
      targetWeightKg: u.targetWeightKg,
      medicalConditions: u.medicalConditions ?? null,
      allergies: u.allergies ?? null,
      medications: u.medications ?? null,
    };
  } catch (err) {
    throw new Error(`fetch_userProfile_failed: ${String(err)}`);
  }
}

export async function getAppointments(
  userId: string,
): Promise<AppointmentSummary[]> {

  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.appointment.findMany({
      where: {
        patientId: userId,
        startTime: { gte: now, lte: horizon },
        status: { in: ["SCHEDULED", "PENDING"] },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        type: true,
        status: true,
        professionalRole: true,
        professional: {
          select: { fullName: true },
        },
      },
    });
    return rows.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      type: a.type,
      professional: {
        name: a.professional.fullName,
        role: a.professionalRole,
      },
      status: a.status,
    }));
  } catch (err) {
    throw new Error(`fetch_appointments_failed: ${String(err)}`);
  }
}

export async function getBiometricsSummary(
  userId: string,
): Promise<BiometricsSummary> {

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await prisma.biometricLog.findMany({
      where: { patientId: userId, date: { gte: cutoff } },
      orderBy: { date: "desc" },
      select: {
        date: true,
        weight: true,
        systolicBP: true,
        diastolicBP: true,
        sleepHours: true,
        energyLevel: true,
      },
    });

    const latestWeight = logs.find((l) => l.weight != null)?.weight ?? null;
    const weight7dAgo =
      logs
        .filter((l) => l.date <= sevenAgo && l.weight != null)
        .at(0)?.weight ?? null;
    const weightDelta =
      latestWeight != null && weight7dAgo != null
        ? latestWeight - weight7dAgo
        : 0;

    const bpLast7d = logs.filter(
      (l) =>
        l.date >= sevenAgo && l.systolicBP != null && l.diastolicBP != null,
    );
    const sys =
      bpLast7d.length > 0
        ? Math.round(
            bpLast7d.reduce((acc, l) => acc + (l.systolicBP ?? 0), 0) /
              bpLast7d.length,
          )
        : null;
    const dia =
      bpLast7d.length > 0
        ? Math.round(
            bpLast7d.reduce((acc, l) => acc + (l.diastolicBP ?? 0), 0) /
              bpLast7d.length,
          )
        : null;

    const bpPrev = logs.filter(
      (l) =>
        l.date < sevenAgo && l.systolicBP != null && l.diastolicBP != null,
    );
    const sysPrev =
      bpPrev.length > 0
        ? bpPrev.reduce((acc, l) => acc + (l.systolicBP ?? 0), 0) /
          bpPrev.length
        : null;
    const bpTrend: Trend =
      sys != null && sysPrev != null
        ? trendFromDelta(sys - sysPrev, 2, /* invert */ true)
        : "flat";

    const sleep7d = logs.filter(
      (l) => l.date >= sevenAgo && l.sleepHours != null,
    );
    const sleepAvg =
      sleep7d.length > 0
        ? sleep7d.reduce((acc, l) => acc + (l.sleepHours ?? 0), 0) /
          sleep7d.length
        : null;
    const sleepPrev = logs.filter(
      (l) => l.date < sevenAgo && l.sleepHours != null,
    );
    const sleepPrevAvg =
      sleepPrev.length > 0
        ? sleepPrev.reduce((acc, l) => acc + (l.sleepHours ?? 0), 0) /
          sleepPrev.length
        : null;
    const sleepTrend: Trend =
      sleepAvg != null && sleepPrevAvg != null
        ? trendFromDelta(sleepAvg - sleepPrevAvg, 0.25)
        : "flat";

    const energy7d = logs.filter(
      (l) => l.date >= sevenAgo && l.energyLevel != null,
    );
    const energyAvg =
      energy7d.length > 0
        ? energy7d.reduce((acc, l) => acc + (l.energyLevel ?? 0), 0) /
          energy7d.length /
          /* schema is 1-10, normalize to 1-5 */ 2
        : null;
    const energyPrev = logs.filter(
      (l) => l.date < sevenAgo && l.energyLevel != null,
    );
    const energyPrevAvg =
      energyPrev.length > 0
        ? energyPrev.reduce((acc, l) => acc + (l.energyLevel ?? 0), 0) /
          energyPrev.length /
          2
        : null;
    const energyTrend: Trend =
      energyAvg != null && energyPrevAvg != null
        ? trendFromDelta(energyAvg - energyPrevAvg, 0.2)
        : "flat";

    return {
      weight: {
        value: latestWeight,
        trend: trendFromDelta(weightDelta, 0.3),
        delta: Number(weightDelta.toFixed(1)),
      },
      bloodPressure: { sys, dia, trend: bpTrend },
      sleepHours: {
        value: sleepAvg != null ? Number(sleepAvg.toFixed(1)) : null,
        trend: sleepTrend,
      },
      energyLevel: {
        value: energyAvg != null ? Number(energyAvg.toFixed(1)) : null,
        trend: energyTrend,
      },
    };
  } catch (err) {
    throw new Error(`fetch_biometricsSummary_failed: ${String(err)}`);
  }
}

export async function getTherapyAdherence(
  userId: string,
): Promise<TherapyAdherenceItem[]> {

  try {
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const items = await prisma.therapyItem.findMany({
      where: { patientId: userId, active: true },
      select: {
        id: true,
        name: true,
        frequency: true,
        daysOfWeek: true,
        intakes: {
          where: { date: { gte: sevenAgo }, taken: true },
          select: { date: true, takenAt: true },
        },
      },
    });

    return items.map((it) => {
      // Heuristic: every item runs once/day unless `daysOfWeek` is set.
      const expectedPerWeek =
        it.daysOfWeek.length > 0 ? it.daysOfWeek.length : 7;
      const takenLast7d = it.intakes.length;
      const pctAdherence = Math.min(
        100,
        Math.round((takenLast7d / Math.max(1, expectedPerWeek)) * 100),
      );

      // Synthesize lastMissedAt: most recent expected date with no intake.
      // Without a per-day expectation map, we approximate using the last
      // intake gap (>= 36h since a taken row).
      const latestTaken = it.intakes
        .map((i) => i.takenAt ?? i.date)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      const hoursSinceLatest =
        latestTaken != null
          ? (now.getTime() - latestTaken.getTime()) / (1000 * 60 * 60)
          : Infinity;
      const lastMissedAt =
        hoursSinceLatest > 36 && pctAdherence < 100
          ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
          : null;

      return {
        id: it.id,
        name: it.name,
        expectedPerWeek,
        takenLast7d,
        pctAdherence,
        lastMissedAt,
      };
    });
  } catch (err) {
    throw new Error(`fetch_therapyAdherence_failed: ${String(err)}`);
  }
}

export async function getNotifications(
  userId: string,
): Promise<NotificationSummary[]> {

  try {
    const rows = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      urgent: n.type === "PAYMENT" || n.type === "CHECK_IN",
      createdAt: n.createdAt,
    }));
  } catch (err) {
    throw new Error(`fetch_notifications_failed: ${String(err)}`);
  }
}

export async function getMyTeam(userId: string): Promise<TeamSummary> {

  try {
    const rels = await prisma.careRelationship.findMany({
      where: { patientId: userId, status: "ACTIVE" },
      select: {
        professionalRole: true,
        status: true,
        professional: {
          select: { id: true, fullName: true },
        },
      },
    });

    const doctor = rels.find((r) => r.professionalRole === "DOCTOR");
    const coach = rels.find((r) => r.professionalRole === "COACH");
    return {
      doctor: doctor
        ? {
            id: doctor.professional.id,
            name: doctor.professional.fullName,
            status: doctor.status,
          }
        : null,
      coach: coach
        ? {
            id: coach.professional.id,
            name: coach.professional.fullName,
            status: coach.status,
          }
        : null,
    };
  } catch (err) {
    throw new Error(`fetch_myTeam_failed: ${String(err)}`);
  }
}

export async function getReports(userId: string): Promise<ReportSummary[]> {

  try {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const rows = await prisma.medicalReport.findMany({
      where: {
        patientId: userId,
        OR: [{ issuedAt: { gte: cutoff } }, { uploadedAt: { gte: cutoff } }],
      },
      orderBy: { uploadedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        issuedAt: true,
        uploadedAt: true,
        notes: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      issuedAt: r.issuedAt ?? r.uploadedAt,
      summary: r.notes ?? undefined,
    }));
  } catch (err) {
    throw new Error(`fetch_reports_failed: ${String(err)}`);
  }
}

export async function getCheckIns(userId: string): Promise<CheckInSummary[]> {

  try {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const rows = await prisma.checkIn.findMany({
      where: { patientId: userId, date: { gte: cutoff } },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true,
        date: true,
        status: true,
        professionalRole: true,
      },
    });
    return rows.map((c) => ({
      id: c.id,
      dueDate: c.date,
      completedAt: c.status === "REVIEWED" ? c.date : null,
      type: c.professionalRole,
    }));
  } catch (err) {
    throw new Error(`fetch_checkIns_failed: ${String(err)}`);
  }
}

export async function getActiveSubscription(
  userId: string,
): Promise<SubscriptionSummary> {

  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
      orderBy: { currentPeriodEnd: "desc" },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });
    if (!sub) return null;
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  } catch (err) {
    throw new Error(`fetch_activeSubscription_failed: ${String(err)}`);
  }
}
