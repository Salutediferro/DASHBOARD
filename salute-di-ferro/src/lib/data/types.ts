/**
 * Shared TypeScript types for the data layer feeding the Agente di Ferro
 * proactive page. Both `real.ts` (Prisma) and `mock.ts` (in-memory scenarios)
 * implement the same fetch surface so the page is data-source-agnostic.
 *
 * Design notes:
 *  - Values exposed to the LLM must NEVER contain raw clinical numbers
 *    (e.g. "Vit D 18 ng/ml"). The briefing summary aggregates and labels
 *    out-of-range markers without leaking the underlying figures.
 *  - `Date` is used for typed server-side handling; serialize at the
 *    component boundary if needed.
 */

import type { ProfileField } from "@/lib/profile-completeness";

/** "up" / "down" / "flat" — direction of a metric over a short window. */
export type Trend = "up" | "down" | "flat";

/** Tone token used by the body-system summary panels. */
export type SystemTone = "attention" | "informational" | "silent";

/** Five physiological lenses we summarize on the agent landing page. */
export type BodySystemKey =
  | "recovery"
  | "hormones"
  | "cardio"
  | "metabolic"
  | "energy";

/** Persona used by greeting + briefing to phrase content. */
export type Persona = "onboarding" | "early" | "mature";

/** Sex enum mirrored from Prisma; kept local so consumers don't pull the
 * generated client just for a string union. */
export type Sex = "MALE" | "FEMALE" | "OTHER";

// ---------------------------------------------------------------
// User
// ---------------------------------------------------------------

export type UserProfileSummary = {
  id: string;
  firstName: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR" | "COACH" | "PATIENT";
  /** 0-100 — profile completeness percent, drives the "onboarding" persona. */
  completeness: number;
  /** Whole days since `createdAt`. 0 on signup day. */
  daysActive: number;
  onboardingCompleted: boolean;
  sex: Sex | null;
  ageYears: number | null;
  heightCm: number | null;
  targetWeightKg: number | null;
  /** Free-text clinical context dichiarato dal paziente (PII —
   * mai esposto all'LLM. Surface in UI come badge per i professionisti
   * del paziente stesso). Stringa raw o null. */
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  missingProfileFields?: ProfileField[];
};

// ---------------------------------------------------------------
// Biometrics
// ---------------------------------------------------------------

export type WeightMetric = {
  value: number | null;
  trend: Trend;
  /** kg delta vs ~7 days ago. Positive = gained, negative = lost. */
  delta: number;
};

export type BloodPressureMetric = {
  sys: number | null;
  dia: number | null;
  trend: Trend;
};

export type SleepMetric = {
  /** Mean hours of sleep across the last 7 days. */
  value: number | null;
  trend: Trend;
};

export type EnergyMetric = {
  /** Mean 1-5 self-report. */
  value: number | null;
  trend: Trend;
};

export type BiometricsSummary = {
  weight: WeightMetric;
  bloodPressure: BloodPressureMetric;
  sleepHours: SleepMetric;
  energyLevel: EnergyMetric;
};

// ---------------------------------------------------------------
// Therapy
// ---------------------------------------------------------------

export type TherapyAdherenceItem = {
  id: string;
  name: string;
  /** Expected intakes over a 7-day window (e.g. 7 for once/day, 14 for 2/day). */
  expectedPerWeek: number;
  takenLast7d: number;
  /** 0-100. */
  pctAdherence: number;
  lastMissedAt: Date | null;
};

// ---------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------

export type AppointmentSummary = {
  id: string;
  startTime: Date;
  type: string;
  professional: {
    name: string;
    role: "DOCTOR" | "COACH";
  };
  status: string;
};

// ---------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------

export type NotificationSummary = {
  id: string;
  title: string;
  type: string;
  urgent: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------
// Team
// ---------------------------------------------------------------

export type TeamMember = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
} | null;

export type TeamSummary = {
  doctor: TeamMember;
  coach: TeamMember;
};

// ---------------------------------------------------------------
// Reports
// ---------------------------------------------------------------

export type ReportSummary = {
  id: string;
  title: string;
  category: string;
  issuedAt: Date;
  summary?: string;
};

// ---------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------

export type CheckInSummary = {
  id: string;
  dueDate: Date;
  completedAt: Date | null;
  type: string;
};

// ---------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------

export type SubscriptionSummary = {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
} | null;

// ---------------------------------------------------------------
// Body system + briefing
// ---------------------------------------------------------------

export type SystemMarker = {
  name: string;
  /** Human label only — no raw numbers. e.g. "leggermente sopra range". */
  value: string;
  range: string;
  tone: SystemTone;
};

export type BodySystemStatus = {
  system: BodySystemKey;
  tone: SystemTone;
  markers: SystemMarker[];
  /** Plain-language one-sentence digest. Safe for the LLM prompt. */
  summary: string;
};

export type BriefingMission = {
  text: string;
  ctaLabel: string;
  ctaHref: string;
};

export type BriefingAction = {
  label: string;
  /** Higher = more urgent; the ranker sorts desc. */
  urgency: number;
  kind:
    | "therapy"
    | "checkin"
    | "appointment"
    | "marker"
    | "profile"
    | "panel"
    | "routine";
  itemId?: string;
};

export type BriefingSummary = {
  persona: Persona;
  mission: BriefingMission;
  stats: BiometricsSummary;
  topActions: BriefingAction[];
  bodySystems: BodySystemStatus[];
  /** First name, used by the greeting template. */
  firstName: string;
  /** 0-100 — profile completeness percent, drives the onboarding empty state. */
  completeness: number;
  /** Number of attention-toned items across all systems. */
  attentionCount: number;
  /** Next upcoming appointment within 7 days, if any (for greeting). */
  nextAppointment: AppointmentSummary | null;
  // ---- Fase 1 (2026-05-18) · arricchimento dashboard ----
  /** Terapie attive con aderenza ultima settimana (surface dei dati già
   * usati internamente per buildTopActions, esposti come dashboard widget). */
  therapyAdherence: TherapyAdherenceItem[];
  /** Ultimo referto rilevante (BLOOD_TEST max 60gg), null altrimenti. */
  recentReport: {
    id: string;
    title: string;
    daysAgo: number;
    /** Plain-text snippet 1 frase (max 200 char), già safe per UI. */
    snippet: string;
  } | null;
  /** Giorni di ritardo sul prossimo check-in pending. 0 se nessuno overdue. */
  checkInOverdueDays: number;
  /** Profilo clinico dichiarato dal paziente — surface in UI come badge.
   * I valori sono stringhe free-text, possono essere null. */
  conditions: {
    medical: string | null;
    allergies: string | null;
    medications: string | null;
  };
};
