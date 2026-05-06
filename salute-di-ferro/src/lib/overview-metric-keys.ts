/**
 * Server-and-client-safe metric vocabulary for the customisable
 * overview cards. Lives outside `use-overview-prefs.ts` because that
 * file carries `"use client"` and is therefore not safe to import
 * (value-side) from server contexts like API routes — the build can
 * end up with a stale/empty constant on the server side, which made
 * `z.enum(...)` reject every well-formed metricKey we sent.
 *
 * Keep this list in sync with the registry in `patient-overview.tsx`.
 */

export const OVERVIEW_METRIC_KEYS = [
  // Core / cross-cutting
  "weight",
  "weightDelta",
  "bmi",
  "checkIns",
  "nextAppointment",
  // Body composition
  "bodyFat",
  "muscleMass",
  "bodyWater",
  // Circumferences
  "waist",
  "hips",
  "chest",
  "arms",
  "thigh",
  "calves",
  // Cardiovascular
  "bloodPressure",
  "restingHR",
  "spo2",
  "hrv",
  // Metabolic
  "glucoseFasting",
  "glucosePostMeal",
  "bodyTempC",
  "ketones",
  // Sleep
  "sleepHours",
  "sleepQuality",
  "sleepAwakenings",
  // Activity
  "steps",
  "caloriesBurned",
  "activeMinutes",
  "distanceKm",
  // Wellbeing
  "mood",
  "energy",
  "energyLevel",
] as const;

export type OverviewMetricKey = (typeof OVERVIEW_METRIC_KEYS)[number];

export const OVERVIEW_MAX = 4;

export const OVERVIEW_DEFAULT: OverviewMetricKey[] = [
  "weight",
  "bmi",
  "checkIns",
  "nextAppointment",
];

/**
 * Map BiometricLog field names (e.g. "weight", "waistCm", "systolicBP")
 * to the overview-card key vocabulary used by the editor dialog and the
 * `useMetricTargets` hook. Composite metrics (BP) collapse two fields
 * into one editor entry.
 *
 * Lives here so both the health-page tabs and the health-page Panoramica
 * rings can share a single mapping without duplicating it.
 */
export const FIELD_TO_OVERVIEW_KEY: Partial<Record<string, OverviewMetricKey>> = {
  weight: "weight",
  bmi: "bmi",
  bodyFatPercentage: "bodyFat",
  muscleMassKg: "muscleMass",
  bodyWaterPct: "bodyWater",
  waistCm: "waist",
  hipsCm: "hips",
  chestCm: "chest",
  armsCm: "arms",
  thighCm: "thigh",
  calvesCm: "calves",
  systolicBP: "bloodPressure",
  diastolicBP: "bloodPressure",
  restingHR: "restingHR",
  spo2: "spo2",
  hrv: "hrv",
  glucoseFasting: "glucoseFasting",
  glucosePostMeal: "glucosePostMeal",
  bodyTempC: "bodyTempC",
  ketones: "ketones",
  sleepHours: "sleepHours",
  sleepQuality: "sleepQuality",
  sleepAwakenings: "sleepAwakenings",
  steps: "steps",
  caloriesBurned: "caloriesBurned",
  activeMinutes: "activeMinutes",
  distanceKm: "distanceKm",
};

/**
 * Maps overview-card keys to the health-page category that should be
 * visible when that metric is tracked. Used by the health page to
 * decide which tabs/rings to surface.
 *
 * Why this exists separately from `FIELD_TO_OVERVIEW_KEY`: that map
 * goes biometric-field → overview-key (driven by editable inputs).
 * Some overview keys have no editable field (e.g. `bmi` is derived
 * from weight + height, not entered directly), so reversing the map
 * would lose them — and the health page would silently hide a
 * category the dashboard happily displays.
 *
 * Keys without an entry (mood, energy, energyLevel, weightDelta,
 * checkIns, nextAppointment) deliberately don't surface any health
 * category — they live on the dashboard only.
 */
export const OVERVIEW_KEY_TO_HEALTH_CATEGORY: Partial<
  Record<OverviewMetricKey, "body" | "circumferences" | "cardiovascular" | "metabolic" | "sleep" | "activity">
> = {
  weight: "body",
  bmi: "body",
  bodyFat: "body",
  muscleMass: "body",
  bodyWater: "body",
  waist: "circumferences",
  hips: "circumferences",
  chest: "circumferences",
  arms: "circumferences",
  thigh: "circumferences",
  calves: "circumferences",
  bloodPressure: "cardiovascular",
  restingHR: "cardiovascular",
  spo2: "cardiovascular",
  hrv: "cardiovascular",
  glucoseFasting: "metabolic",
  glucosePostMeal: "metabolic",
  bodyTempC: "metabolic",
  ketones: "metabolic",
  sleepHours: "sleep",
  sleepQuality: "sleep",
  sleepAwakenings: "sleep",
  steps: "activity",
  caloriesBurned: "activity",
  activeMinutes: "activity",
  distanceKm: "activity",
};
