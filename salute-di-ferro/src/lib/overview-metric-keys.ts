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
