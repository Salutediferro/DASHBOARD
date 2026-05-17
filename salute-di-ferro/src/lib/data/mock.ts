/**
 * Mock fetchers for the Agente di Ferro proactive page.
 *
 * Scenarios (selected by the leading prefix of `userId`):
 *   - `mock-onboarding`  → fresh signup, 25% profile, day 0
 *   - `mock-early`       → 80% profile, day 14, building habits
 *   - `mock-mature-healthy` → day 60, everything in range
 *   - `mock-mature-attention` → day 90, Vit D low, ferritin high,
 *     missed magnesium x4, overdue check-in, coach call Thursday
 *
 * Anything else (including a real Supabase paziente UUID under dev bypass)
 * defaults to the richest scenario so the UI is well-populated during
 * design iteration.
 *
 * Note: these helpers are intentionally NOT cached. Mock data already
 * lives in-process and `'use cache'` on a function that returns Dates
 * computed at call-time would defeat the "every reload looks fresh"
 * dev-experience we want here.
 */

import type {
  AppointmentSummary,
  BiometricsSummary,
  CheckInSummary,
  NotificationSummary,
  ReportSummary,
  SubscriptionSummary,
  TeamSummary,
  TherapyAdherenceItem,
  UserProfileSummary,
} from "./types";

type Scenario =
  | "onboarding"
  | "early"
  | "mature-healthy"
  | "mature-attention";

function pickScenario(userId: string): Scenario {
  if (userId.startsWith("mock-onboarding")) return "onboarding";
  if (userId.startsWith("mock-early")) return "early";
  if (userId.startsWith("mock-mature-healthy")) return "mature-healthy";
  if (userId.startsWith("mock-mature-attention")) return "mature-attention";
  return "mature-attention";
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysAhead(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------
// User
// ---------------------------------------------------------------

export async function getUserProfile(
  userId: string,
): Promise<UserProfileSummary | null> {
  const s = pickScenario(userId);
  const base = {
    id: userId,
    firstName: "Marco",
    fullName: "Marco Rossi",
    role: "PATIENT" as const,
    sex: "MALE" as const,
    ageYears: 38,
    heightCm: 178,
    targetWeightKg: 80,
  };
  switch (s) {
    case "onboarding":
      return {
        ...base,
        firstName: "Luca",
        fullName: "Luca Bianchi",
        completeness: 25,
        daysActive: 0,
        onboardingCompleted: false,
        targetWeightKg: null,
        heightCm: null,
      };
    case "early":
      return {
        ...base,
        firstName: "Sara",
        fullName: "Sara Conti",
        sex: "FEMALE",
        ageYears: 34,
        heightCm: 168,
        targetWeightKg: 62,
        completeness: 80,
        daysActive: 14,
        onboardingCompleted: true,
      };
    case "mature-healthy":
      return {
        ...base,
        completeness: 100,
        daysActive: 60,
        onboardingCompleted: true,
      };
    case "mature-attention":
    default:
      return {
        ...base,
        completeness: 100,
        daysActive: 90,
        onboardingCompleted: true,
      };
  }
}

// ---------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------

export async function getAppointments(
  userId: string,
): Promise<AppointmentSummary[]> {
  const s = pickScenario(userId);
  if (s === "onboarding") return [];

  if (s === "early") {
    return [
      {
        id: "mock-appt-1",
        startTime: daysAhead(5),
        type: "VIDEO_CALL",
        professional: { name: "Dr. Giulia Romano", role: "DOCTOR" },
        status: "SCHEDULED",
      },
    ];
  }

  if (s === "mature-healthy") {
    return [
      {
        id: "mock-appt-2",
        startTime: daysAhead(21),
        type: "VIDEO_CALL",
        professional: { name: "Coach Daniele Greco", role: "COACH" },
        status: "SCHEDULED",
      },
    ];
  }

  // mature-attention — coach call on Thursday (next Thu)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun..6=Sat
  const daysUntilThu = (4 - dayOfWeek + 7) % 7 || 7;
  const thuStart = new Date(today);
  thuStart.setDate(today.getDate() + daysUntilThu);
  thuStart.setHours(18, 0, 0, 0);

  return [
    {
      id: "mock-appt-coach-thu",
      startTime: thuStart,
      type: "VIDEO_CALL",
      professional: { name: "Coach Daniele Greco", role: "COACH" },
      status: "SCHEDULED",
    },
    {
      id: "mock-appt-doctor-followup",
      startTime: daysAhead(18),
      type: "VIDEO_CALL",
      professional: { name: "Dr. Giulia Romano", role: "DOCTOR" },
      status: "SCHEDULED",
    },
  ];
}

// ---------------------------------------------------------------
// Biometrics
// ---------------------------------------------------------------

export async function getBiometricsSummary(
  userId: string,
): Promise<BiometricsSummary> {
  const s = pickScenario(userId);

  switch (s) {
    case "onboarding":
      return {
        weight: { value: null, trend: "flat", delta: 0 },
        bloodPressure: { sys: null, dia: null, trend: "flat" },
        sleepHours: { value: null, trend: "flat" },
        energyLevel: { value: null, trend: "flat" },
      };
    case "early":
      return {
        weight: { value: 64.2, trend: "down", delta: -0.6 },
        bloodPressure: { sys: 115, dia: 72, trend: "flat" },
        sleepHours: { value: 7.1, trend: "up" },
        energyLevel: { value: 3.8, trend: "up" },
      };
    case "mature-healthy":
      return {
        weight: { value: 81.0, trend: "flat", delta: 0.1 },
        bloodPressure: { sys: 120, dia: 78, trend: "flat" },
        sleepHours: { value: 7.6, trend: "flat" },
        energyLevel: { value: 4.2, trend: "flat" },
      };
    case "mature-attention":
    default:
      // Brief explicitly calls for: weight 83.1 trend down, BP 118/76 trend
      // down, sleep 6h40 (≈6.7) trend up, energy 3.4/5 flat.
      return {
        weight: { value: 83.1, trend: "down", delta: -0.9 },
        bloodPressure: { sys: 118, dia: 76, trend: "down" },
        sleepHours: { value: 6.7, trend: "up" },
        energyLevel: { value: 3.4, trend: "flat" },
      };
  }
}

// ---------------------------------------------------------------
// Therapy adherence
// ---------------------------------------------------------------

export async function getTherapyAdherence(
  userId: string,
): Promise<TherapyAdherenceItem[]> {
  const s = pickScenario(userId);

  switch (s) {
    case "onboarding":
      return [];
    case "early":
      return [
        {
          id: "mock-th-omega3",
          name: "Omega 3",
          expectedPerWeek: 7,
          takenLast7d: 5,
          pctAdherence: 71,
          lastMissedAt: daysAgo(1),
        },
      ];
    case "mature-healthy":
      return [
        {
          id: "mock-th-magnesio",
          name: "Magnesio",
          expectedPerWeek: 7,
          takenLast7d: 7,
          pctAdherence: 100,
          lastMissedAt: null,
        },
        {
          id: "mock-th-vitd",
          name: "Vit D3 + K2",
          expectedPerWeek: 7,
          takenLast7d: 6,
          pctAdherence: 86,
          lastMissedAt: daysAgo(3),
        },
      ];
    case "mature-attention":
    default:
      return [
        {
          id: "mock-th-magnesio",
          name: "Magnesio",
          expectedPerWeek: 7,
          takenLast7d: 3,
          pctAdherence: 43,
          lastMissedAt: daysAgo(1),
        },
        {
          id: "mock-th-vitd",
          name: "Vit D3 + K2",
          expectedPerWeek: 7,
          takenLast7d: 6,
          pctAdherence: 86,
          lastMissedAt: daysAgo(2),
        },
        {
          id: "mock-th-omega3",
          name: "Omega 3",
          expectedPerWeek: 7,
          takenLast7d: 7,
          pctAdherence: 100,
          lastMissedAt: null,
        },
      ];
  }
}

// ---------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------

export async function getNotifications(
  userId: string,
): Promise<NotificationSummary[]> {
  const s = pickScenario(userId);

  switch (s) {
    case "onboarding":
      return [
        {
          id: "mock-notif-welcome",
          title: "Benvenuto. Completa il profilo.",
          type: "SYSTEM",
          urgent: false,
          createdAt: daysAgo(0),
        },
      ];
    case "early":
      return [
        {
          id: "mock-notif-checkin",
          title: "Primo check-in disponibile",
          type: "CHECK_IN",
          urgent: false,
          createdAt: daysAgo(1),
        },
      ];
    case "mature-healthy":
      return [];
    case "mature-attention":
    default:
      return [
        {
          id: "mock-notif-checkin-overdue",
          title: "Check-in scaduto da 2 giorni",
          type: "CHECK_IN",
          urgent: true,
          createdAt: daysAgo(2),
        },
        {
          id: "mock-notif-coach",
          title: "Promemoria call Coach",
          type: "REMINDER",
          urgent: false,
          createdAt: daysAgo(0),
        },
      ];
  }
}

// ---------------------------------------------------------------
// Team
// ---------------------------------------------------------------

export async function getMyTeam(userId: string): Promise<TeamSummary> {
  const s = pickScenario(userId);

  if (s === "onboarding") {
    return { doctor: null, coach: null };
  }
  if (s === "early") {
    return {
      doctor: {
        id: "mock-doc-romano",
        name: "Dr. Giulia Romano",
        status: "ACTIVE",
      },
      coach: null,
    };
  }
  return {
    doctor: { id: "mock-doc-romano", name: "Dr. Giulia Romano", status: "ACTIVE" },
    coach: { id: "mock-coach-greco", name: "Coach Daniele Greco", status: "ACTIVE" },
  };
}

// ---------------------------------------------------------------
// Reports
// ---------------------------------------------------------------

export async function getReports(userId: string): Promise<ReportSummary[]> {
  const s = pickScenario(userId);

  switch (s) {
    case "onboarding":
      return [];
    case "early":
      return [
        {
          id: "mock-rep-blood-1",
          title: "Emocromo completo",
          category: "BLOOD_TEST",
          issuedAt: daysAgo(10),
          summary: "Valori nel range. Da rivalutare emoglobina tra 3 mesi.",
        },
      ];
    case "mature-healthy":
      return [
        {
          id: "mock-rep-blood-2",
          title: "Pannello ormonale Q1",
          category: "ENDOCRINOLOGY",
          issuedAt: daysAgo(30),
          summary: "Tutti i marker in range. Continuare protocollo.",
        },
        {
          id: "mock-rep-blood-3",
          title: "Lipidi + glucosio",
          category: "BLOOD_TEST",
          issuedAt: daysAgo(60),
        },
      ];
    case "mature-attention":
    default:
      return [
        {
          id: "mock-rep-blood-recent",
          title: "Pannello vitamine + minerali",
          category: "BLOOD_TEST",
          issuedAt: daysAgo(7),
          summary: "1 marker sotto range, 1 da rivedere col Coach.",
        },
        {
          id: "mock-rep-endo",
          title: "Profilo ormonale",
          category: "ENDOCRINOLOGY",
          issuedAt: daysAgo(45),
          summary: "Cortisolo e testosterone nella norma.",
        },
      ];
  }
}

// ---------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------

export async function getCheckIns(userId: string): Promise<CheckInSummary[]> {
  const s = pickScenario(userId);

  switch (s) {
    case "onboarding":
      return [];
    case "early":
      return [
        {
          id: "mock-ci-1",
          dueDate: daysAhead(3),
          completedAt: null,
          type: "COACH",
        },
      ];
    case "mature-healthy":
      return [
        {
          id: "mock-ci-recent",
          dueDate: daysAgo(2),
          completedAt: daysAgo(2),
          type: "COACH",
        },
      ];
    case "mature-attention":
    default:
      return [
        // Overdue 2 days — surfaces in topActions
        {
          id: "mock-ci-overdue",
          dueDate: daysAgo(2),
          completedAt: null,
          type: "COACH",
        },
        {
          id: "mock-ci-prev",
          dueDate: daysAgo(16),
          completedAt: daysAgo(16),
          type: "COACH",
        },
      ];
  }
}

// ---------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------

export async function getActiveSubscription(
  userId: string,
): Promise<SubscriptionSummary> {
  const s = pickScenario(userId);
  if (s === "onboarding") return null;
  return {
    id: "mock-sub-founder",
    status: "ACTIVE",
    currentPeriodEnd: daysAhead(180),
    cancelAtPeriodEnd: false,
  };
}
