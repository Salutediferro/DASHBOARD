import { prisma } from "@/lib/prisma";
import { getUnreadCount as getUnreadNotifications } from "@/lib/services/notifications";

// ---------- Shared types ---------- //

export type TimelineEntry = {
  id: string;
  kind:
    | "CHECK_IN"
    | "BIOMETRIC"
    | "APPOINTMENT"
    | "REPORT"
    | "MEDICATION"
    | "SYMPTOM"
    | "USER_SIGNUP"
    | "AUDIT";
  date: string; // ISO
  title: string;
  description: string | null;
  href: string | null;
};

export type QuickLink = {
  label: string;
  description: string;
  href: string;
};

export type NextEvent =
  | {
      kind: "appointment";
      id: string;
      title: string;
      whenLabel: string;
      daysAway: number;
      href: string;
    }
  | null;

// ---------- Date helpers ---------- //

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfIsoWeek(d: Date = new Date()): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const mondayDiff = (day + 6) % 7;
  x.setDate(x.getDate() - mondayDiff);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function daysBetween(from: Date, to: Date): number {
  const ms = endOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Build a 14-day daily series by bucketing input points (date + value).
export function buildDailySeries(
  points: Array<{ date: Date; value: number | null }>,
  days = 14,
): number[] {
  const today = startOfDay();
  const start = addDays(today, -(days - 1));
  const series: number[] = Array(days).fill(0);
  const counts: number[] = Array(days).fill(0);
  for (const p of points) {
    if (p.value == null) continue;
    const d = startOfDay(p.date);
    const idx = Math.floor(
      (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (idx < 0 || idx >= days) continue;
    series[idx] += p.value;
    counts[idx] += 1;
  }
  // Forward-fill empty buckets with last known value so the sparkline
  // reads as a trend, not a binary spike.
  let last = 0;
  for (let i = 0; i < days; i++) {
    if (counts[i] > 0) {
      series[i] = series[i] / counts[i];
      last = series[i];
    } else {
      series[i] = last;
    }
  }
  return series;
}

// ---------- PATIENT ---------- //

// Per-metric snapshot powering the customisable overview cards.
// `current` is the most recent reading in the 14-day window, `delta14d`
// is the raw change between the first and last reading (null if we only
// have one data point), and `series` is the daily forward-filled series
// suitable for a sparkline.
export type MetricSeries = {
  current: number | null;
  delta14d: number | null;
  series: number[];
  hasData: boolean;
};

// Keys for the per-patient metrics registry. Stays in sync with
// OVERVIEW_METRIC_KEYS in use-overview-prefs — see comment there.
export type PatientMetricKey =
  | "weight"
  | "bmi"
  | "bodyFat"
  | "muscleMass"
  | "bodyWater"
  | "waist"
  | "hips"
  | "chest"
  | "arms"
  | "thigh"
  | "calves"
  | "systolicBP"
  | "diastolicBP"
  | "restingHR"
  | "spo2"
  | "hrv"
  | "glucoseFasting"
  | "glucosePostMeal"
  | "bodyTempC"
  | "ketones"
  | "sleepHours"
  | "sleepQuality"
  | "sleepAwakenings"
  | "steps"
  | "caloriesBurned"
  | "activeMinutes"
  | "distanceKm"
  | "energyLevel"
  | "mood"
  | "energy";

export type PatientKpis = {
  currentWeightKg: number | null;
  weightDelta14d: number | null;
  bmi: number | null;
  checkInsThisWeek: number;
  nextAppointment: NextEvent;
  sparklines: {
    weight: number[] | null;
    bmi: number[] | null;
    checkIns: number[];
  };
  metrics: Record<PatientMetricKey, MetricSeries>;
};

const EMPTY_METRIC: MetricSeries = {
  current: null,
  delta14d: null,
  series: [],
  hasData: false,
};

function buildMetricSeries(
  points: Array<{ date: Date; value: number | null }>,
): MetricSeries {
  const filtered = points.filter(
    (p): p is { date: Date; value: number } => p.value != null,
  );
  if (filtered.length === 0) return EMPTY_METRIC;
  const series = buildDailySeries(filtered);
  const current = filtered[filtered.length - 1].value;
  const delta14d =
    filtered.length > 1 ? current - filtered[0].value : null;
  return { current, delta14d, series, hasData: true };
}

export async function getPatientKpis(patientId: string): Promise<PatientKpis> {
  const now = new Date();
  const weekStart = startOfIsoWeek(now);
  const twoWeeksAgo = addDays(startOfDay(now), -14);

  const [biometrics, symptoms, checkInsWeekCount, checkInsRecent, nextApp] =
    await Promise.all([
      prisma.biometricLog.findMany({
        where: { patientId, date: { gte: twoWeeksAgo } },
        orderBy: { date: "asc" },
        select: {
          date: true,
          weight: true,
          bmi: true,
          bodyFatPercentage: true,
          muscleMassKg: true,
          bodyWaterPct: true,
          waistCm: true,
          hipsCm: true,
          chestCm: true,
          armsCm: true,
          thighCm: true,
          calvesCm: true,
          systolicBP: true,
          diastolicBP: true,
          restingHR: true,
          spo2: true,
          hrv: true,
          glucoseFasting: true,
          glucosePostMeal: true,
          ketones: true,
          bodyTempC: true,
          sleepHours: true,
          sleepQuality: true,
          sleepAwakenings: true,
          steps: true,
          caloriesBurned: true,
          activeMinutes: true,
          distanceKm: true,
          energyLevel: true,
        },
      }),
      prisma.symptomLog.findMany({
        where: { patientId, date: { gte: twoWeeksAgo } },
        orderBy: { date: "asc" },
        select: { date: true, mood: true, energy: true },
      }),
      prisma.checkIn.count({
        where: { patientId, date: { gte: weekStart } },
      }),
      prisma.checkIn.findMany({
        where: { patientId, date: { gte: twoWeeksAgo } },
        orderBy: { date: "asc" },
        select: { date: true, rating: true },
      }),
      prisma.appointment.findFirst({
        where: {
          patientId,
          startTime: { gte: now },
          status: { not: "CANCELED" },
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          type: true,
          professional: { select: { fullName: true } },
        },
      }),
    ]);

  // Map every Prisma field to a PatientMetricKey via a per-key extractor.
  // Listing these inline (rather than chasing dynamic field access) keeps
  // the types honest with no `as any` cast.
  const extractors: Record<
    PatientMetricKey,
    (i: number) => number | null
  > = {
    weight: (i) => biometrics[i].weight,
    bmi: (i) => biometrics[i].bmi,
    bodyFat: (i) => biometrics[i].bodyFatPercentage,
    muscleMass: (i) => biometrics[i].muscleMassKg,
    bodyWater: (i) => biometrics[i].bodyWaterPct,
    waist: (i) => biometrics[i].waistCm,
    hips: (i) => biometrics[i].hipsCm,
    chest: (i) => biometrics[i].chestCm,
    arms: (i) => biometrics[i].armsCm,
    thigh: (i) => biometrics[i].thighCm,
    calves: (i) => biometrics[i].calvesCm,
    systolicBP: (i) => biometrics[i].systolicBP,
    diastolicBP: (i) => biometrics[i].diastolicBP,
    restingHR: (i) => biometrics[i].restingHR,
    spo2: (i) => biometrics[i].spo2,
    hrv: (i) => biometrics[i].hrv,
    glucoseFasting: (i) => biometrics[i].glucoseFasting,
    glucosePostMeal: (i) => biometrics[i].glucosePostMeal,
    bodyTempC: (i) => biometrics[i].bodyTempC,
    ketones: (i) => biometrics[i].ketones,
    sleepHours: (i) => biometrics[i].sleepHours,
    sleepQuality: (i) => biometrics[i].sleepQuality,
    sleepAwakenings: (i) => biometrics[i].sleepAwakenings,
    steps: (i) => biometrics[i].steps,
    caloriesBurned: (i) => biometrics[i].caloriesBurned,
    activeMinutes: (i) => biometrics[i].activeMinutes,
    distanceKm: (i) => biometrics[i].distanceKm,
    energyLevel: (i) => biometrics[i].energyLevel,
    // Symptom-log derived — different source so we plug in a custom map below.
    mood: () => null,
    energy: () => null,
  };

  const metrics = {} as Record<PatientMetricKey, MetricSeries>;
  for (const key of Object.keys(extractors) as PatientMetricKey[]) {
    if (key === "mood" || key === "energy") continue;
    metrics[key] = buildMetricSeries(
      biometrics.map((b, i) => ({ date: b.date, value: extractors[key](i) })),
    );
  }
  metrics.mood = buildMetricSeries(
    symptoms.map((s) => ({ date: s.date, value: s.mood })),
  );
  metrics.energy = buildMetricSeries(
    symptoms.map((s) => ({ date: s.date, value: s.energy })),
  );

  // Legacy fields kept verbatim so the hero signal and existing cards
  // keep working without reaching into `metrics`.
  const lastWeight = metrics.weight.current;
  const weightDelta = metrics.weight.delta14d;
  const lastBmi = metrics.bmi.current;
  const weightSeries = metrics.weight.hasData ? metrics.weight.series : null;
  const bmiSeries = metrics.bmi.hasData ? metrics.bmi.series : null;
  const checkInSeries = buildDailySeries(
    checkInsRecent.map((c) => ({ date: c.date, value: 1 })),
  );

  const nextAppointment: NextEvent = nextApp
    ? {
        kind: "appointment",
        id: nextApp.id,
        title: nextApp.professional?.fullName
          ? `${nextApp.type} · ${nextApp.professional.fullName}`
          : nextApp.type,
        whenLabel: nextApp.startTime.toLocaleString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
        daysAway: daysBetween(now, nextApp.startTime),
        href: "/dashboard/patient/appointments",
      }
    : null;

  return {
    currentWeightKg: lastWeight,
    weightDelta14d: weightDelta,
    bmi: lastBmi,
    checkInsThisWeek: checkInsWeekCount,
    nextAppointment,
    sparklines: {
      weight: weightSeries,
      bmi: bmiSeries,
      checkIns: checkInSeries,
    },
    metrics,
  };
}

export async function getPatientActivity(
  patientId: string,
  limit = 5,
): Promise<TimelineEntry[]> {
  const [checkIns, biometrics, appointments, reports, medications, symptoms] =
    await Promise.all([
      prisma.checkIn.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
        take: 6,
        select: {
          id: true,
          date: true,
          weight: true,
          rating: true,
          status: true,
        },
      }),
      prisma.biometricLog.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
        take: 6,
        select: { id: true, date: true, weight: true, bmi: true },
      }),
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { startTime: "desc" },
        take: 6,
        select: {
          id: true,
          startTime: true,
          type: true,
          professional: { select: { fullName: true } },
        },
      }),
      prisma.medicalReport.findMany({
        where: { patientId },
        orderBy: { uploadedAt: "desc" },
        take: 6,
        select: { id: true, title: true, category: true, uploadedAt: true },
      }),
      prisma.therapyItem.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          dose: true,
          startDate: true,
          createdAt: true,
          active: true,
        },
      }),
      prisma.symptomLog.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
        take: 6,
        select: {
          id: true,
          date: true,
          mood: true,
          energy: true,
        },
      }),
    ]);

  const events: TimelineEntry[] = [];
  for (const c of checkIns) {
    events.push({
      id: `checkin:${c.id}`,
      kind: "CHECK_IN",
      date: c.date.toISOString(),
      title: c.status === "REVIEWED" ? "Check-in revisionato" : "Check-in inviato",
      description: c.weight != null ? `${c.weight.toFixed(1)} kg` : null,
      href: "/dashboard/patient/appointments",
    });
  }
  for (const b of biometrics) {
    events.push({
      id: `bio:${b.id}`,
      kind: "BIOMETRIC",
      date: b.date.toISOString(),
      title: "Biometria registrata",
      description: [
        b.weight != null ? `${b.weight.toFixed(1)} kg` : null,
        b.bmi != null ? `BMI ${b.bmi.toFixed(1)}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      href: "/dashboard/patient/health",
    });
  }
  for (const a of appointments) {
    events.push({
      id: `app:${a.id}`,
      kind: "APPOINTMENT",
      date: a.startTime.toISOString(),
      title: a.professional?.fullName
        ? `${a.type} con ${a.professional.fullName}`
        : a.type,
      description: null,
      href: "/dashboard/patient/appointments",
    });
  }
  for (const r of reports) {
    events.push({
      id: `rep:${r.id}`,
      kind: "REPORT",
      date: r.uploadedAt.toISOString(),
      title: r.title,
      description: `Referto · ${r.category}`,
      href: "/dashboard/patient/medical-records",
    });
  }
  for (const m of medications) {
    events.push({
      id: `med:${m.id}`,
      kind: "MEDICATION",
      date: (m.startDate ?? m.createdAt).toISOString(),
      title: m.active ? `Supplemento avviato: ${m.name}` : `Supplemento archiviato: ${m.name}`,
      description: m.dose,
      href: "/dashboard/patient/supplementi",
    });
  }
  for (const s of symptoms) {
    events.push({
      id: `sym:${s.id}`,
      kind: "SYMPTOM",
      date: s.date.toISOString(),
      title: "Diario salute",
      description: [
        s.mood != null ? `umore ${s.mood}/5` : null,
        s.energy != null ? `energia ${s.energy}/5` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      href: "/dashboard/patient/symptoms",
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  return events.slice(0, limit);
}

// ---------- COACH / DOCTOR (shared shape) ---------- //

export type ProfessionalKpis = {
  activeClients: number;
  appointmentsToday: number;
  unreadMessages: number;
  // Role-specific third metric:
  checkInsPending?: number; // COACH
  newReports30d?: number; // DOCTOR
  visitsThisWeek?: number; // DOCTOR
};

async function countUnreadMessages(userId: string): Promise<number> {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });
  if (memberships.length === 0) return 0;
  const conversationIds = memberships.map((m) => m.conversationId);
  const perConv = await Promise.all(
    memberships.map((m) =>
      prisma.message.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: userId },
          createdAt: m.lastReadAt ? { gt: m.lastReadAt } : undefined,
        },
      }),
    ),
  );
  // Re-tie to conversationIds only to silence unused warning.
  void conversationIds;
  return perConv.reduce((a, b) => a + b, 0);
}

export async function getCoachKpis(coachId: string): Promise<ProfessionalKpis> {
  const now = new Date();
  const [activeClients, appointmentsToday, checkInsPending, unreadMessages] =
    await Promise.all([
      prisma.careRelationship.count({
        where: {
          professionalId: coachId,
          professionalRole: "COACH",
          status: "ACTIVE",
        },
      }),
      prisma.appointment.count({
        where: {
          professionalId: coachId,
          startTime: { gte: startOfDay(now), lte: endOfDay(now) },
          status: { not: "CANCELED" },
        },
      }),
      prisma.checkIn.count({
        where: {
          professionalId: coachId,
          status: "PENDING",
        },
      }),
      countUnreadMessages(coachId),
    ]);
  return {
    activeClients,
    appointmentsToday,
    checkInsPending,
    unreadMessages,
  };
}

export async function getDoctorKpis(doctorId: string): Promise<ProfessionalKpis> {
  const now = new Date();
  const weekStart = startOfIsoWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const thirtyDaysAgo = addDays(startOfDay(now), -30);

  const [activeClients, appointmentsToday, visitsThisWeek, newReports30d, unreadMessages] =
    await Promise.all([
      prisma.careRelationship.count({
        where: {
          professionalId: doctorId,
          professionalRole: "DOCTOR",
          status: "ACTIVE",
        },
      }),
      prisma.appointment.count({
        where: {
          professionalId: doctorId,
          startTime: { gte: startOfDay(now), lte: endOfDay(now) },
          status: { not: "CANCELED" },
        },
      }),
      prisma.appointment.count({
        where: {
          professionalId: doctorId,
          startTime: { gte: weekStart, lt: weekEnd },
          status: { not: "CANCELED" },
        },
      }),
      prisma.medicalReport.count({
        where: {
          uploadedById: doctorId,
          uploadedAt: { gte: thirtyDaysAgo },
        },
      }),
      countUnreadMessages(doctorId),
    ]);

  return {
    activeClients,
    appointmentsToday,
    visitsThisWeek,
    newReports30d,
    unreadMessages,
  };
}

export async function getProfessionalActivity(
  professionalId: string,
  limit = 5,
): Promise<TimelineEntry[]> {
  const [appointments, checkIns, reports] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId },
      orderBy: { startTime: "desc" },
      take: 6,
      select: {
        id: true,
        startTime: true,
        type: true,
        patient: { select: { fullName: true } },
      },
    }),
    prisma.checkIn.findMany({
      where: { professionalId },
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true,
        date: true,
        status: true,
        weight: true,
        patient: { select: { fullName: true } },
      },
    }),
    prisma.medicalReport.findMany({
      where: { uploadedById: professionalId },
      orderBy: { uploadedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        uploadedAt: true,
        patient: { select: { fullName: true } },
      },
    }),
  ]);

  const events: TimelineEntry[] = [];
  for (const a of appointments) {
    events.push({
      id: `app:${a.id}`,
      kind: "APPOINTMENT",
      date: a.startTime.toISOString(),
      title: `${a.type} · ${a.patient?.fullName ?? "Cliente"}`,
      description: null,
      href: "#",
    });
  }
  for (const c of checkIns) {
    events.push({
      id: `checkin:${c.id}`,
      kind: "CHECK_IN",
      date: c.date.toISOString(),
      title: `Check-in · ${c.patient?.fullName ?? "Cliente"}`,
      description: c.weight != null ? `${c.weight.toFixed(1)} kg · ${c.status}` : c.status,
      href: "#",
    });
  }
  for (const r of reports) {
    events.push({
      id: `rep:${r.id}`,
      kind: "REPORT",
      date: r.uploadedAt.toISOString(),
      title: r.title,
      description: `Referto · ${r.patient?.fullName ?? "Cliente"}`,
      href: "#",
    });
  }
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events.slice(0, limit);
}

export async function getProfessionalNextEvent(
  professionalId: string,
): Promise<NextEvent> {
  const now = new Date();
  const next = await prisma.appointment.findFirst({
    where: {
      professionalId,
      startTime: { gte: now },
      status: { not: "CANCELED" },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      startTime: true,
      type: true,
      patient: { select: { fullName: true } },
    },
  });
  if (!next) return null;
  return {
    kind: "appointment",
    id: next.id,
    title: next.patient?.fullName
      ? `${next.type} · ${next.patient.fullName}`
      : next.type,
    whenLabel: next.startTime.toLocaleString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
    daysAway: daysBetween(now, next.startTime),
    href: "#",
  };
}

// ---------- ADMIN ---------- //

export type AdminKpis = {
  totalUsers: number;
  newSignups7d: number;
  appointments7d: number;
  activeOrganizations: number;
  sparklines: {
    signups: number[];
    appointments: number[];
  };
};

export async function getAdminKpis(): Promise<AdminKpis> {
  const now = new Date();
  const weekAgo = addDays(startOfDay(now), -7);
  const weekAhead = addDays(endOfDay(now), 7);
  const fortnightAgo = addDays(startOfDay(now), -14);

  const [
    totalUsers,
    newSignups7d,
    appointments7d,
    activeOrganizations,
    signupsRecent,
    appointmentsRecent,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.appointment.count({
      where: {
        startTime: { gte: startOfDay(now), lte: weekAhead },
        status: { not: "CANCELED" },
      },
    }),
    prisma.organization.count(),
    prisma.user.findMany({
      where: { createdAt: { gte: fortnightAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        startTime: { gte: fortnightAgo },
        status: { not: "CANCELED" },
      },
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    }),
  ]);

  return {
    totalUsers,
    newSignups7d,
    appointments7d,
    activeOrganizations,
    sparklines: {
      signups: buildDailySeries(
        signupsRecent.map((u) => ({ date: u.createdAt, value: 1 })),
      ),
      appointments: buildDailySeries(
        appointmentsRecent.map((a) => ({ date: a.startTime, value: 1 })),
      ),
    },
  };
}

export async function getAdminActivity(limit = 5): Promise<TimelineEntry[]> {
  const [recentUsers, recentAudits] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { fullName: true } },
      },
    }),
  ]);

  const events: TimelineEntry[] = [];
  for (const u of recentUsers) {
    events.push({
      id: `user:${u.id}`,
      kind: "USER_SIGNUP",
      date: u.createdAt.toISOString(),
      title: `Nuovo ${u.role.toLowerCase()}: ${u.fullName}`,
      description: u.email,
      href: `/dashboard/admin/users`,
    });
  }
  for (const a of recentAudits) {
    events.push({
      id: `audit:${a.id}`,
      kind: "AUDIT",
      date: a.createdAt.toISOString(),
      title: `${a.action} · ${a.entityType}`,
      description: a.actor?.fullName ?? "Sistema",
      href: "/dashboard/admin/audit",
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  return events.slice(0, limit);
}

export { getUnreadNotifications };
