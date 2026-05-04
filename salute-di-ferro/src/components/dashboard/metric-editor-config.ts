/**
 * Per-metric configuration for the click-to-edit dialog on overview
 * cards. Drives both the "Nuova rilevazione" form (which biometric/
 * symptom field to write) and the "Obiettivo personale" input shape.
 *
 * Cards omitted from the map are not editable (computed/aggregate
 * metrics: weightDelta, checkIns, nextAppointment).
 *
 * Min/max ranges mirror `src/lib/validators/biometric.ts` and
 * `src/lib/validators/symptom.ts` — keep them in sync if those move.
 */

import type { OverviewMetricKey } from "@/lib/hooks/use-overview-prefs";

export type BiometricCategory =
  | "body"
  | "circumferences"
  | "skinfolds"
  | "cardiovascular"
  | "metabolic"
  | "sleep"
  | "activity";

type FieldSpec = {
  /** Field name inside the BiometricInput nested category. */
  name: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: string;
  isInt?: boolean;
};

export type EditorConfig =
  | {
      kind: "biometric";
      category: BiometricCategory;
      fields: [FieldSpec] | [FieldSpec, FieldSpec];
      /** Composite target (BP). When present, target inputs come in pairs. */
      composite?: { left: "systolic"; right: "diastolic" };
    }
  | {
      kind: "energy-level";
      // Top-level `energyLevel` field on BiometricInput (not nested).
      label: string;
      min: number;
      max: number;
      isInt: true;
    }
  | {
      kind: "symptom";
      field: "mood" | "energy";
      label: string;
      min: number;
      max: number;
    };

export const EDITOR_CONFIG: Partial<Record<OverviewMetricKey, EditorConfig>> = {
  // Body (BMI shares the weight form — set weight, BMI follows from height)
  weight: {
    kind: "biometric",
    category: "body",
    fields: [{ name: "weight", label: "Peso", unit: "kg", min: 20, max: 300, step: "0.1" }],
  },
  bmi: {
    kind: "biometric",
    category: "body",
    fields: [{ name: "weight", label: "Peso", unit: "kg", min: 20, max: 300, step: "0.1" }],
  },
  bodyFat: {
    kind: "biometric",
    category: "body",
    fields: [
      { name: "bodyFatPercentage", label: "Massa grassa", unit: "%", min: 3, max: 60, step: "0.1" },
    ],
  },
  muscleMass: {
    kind: "biometric",
    category: "body",
    fields: [
      { name: "muscleMassKg", label: "Massa muscolare", unit: "kg", min: 10, max: 120, step: "0.1" },
    ],
  },
  bodyWater: {
    kind: "biometric",
    category: "body",
    fields: [
      { name: "bodyWaterPct", label: "Acqua corporea", unit: "%", min: 20, max: 80, step: "0.1" },
    ],
  },

  // Circumferences
  waist: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "waistCm", label: "Vita", unit: "cm", min: 30, max: 200, step: "0.5" }],
  },
  hips: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "hipsCm", label: "Fianchi", unit: "cm", min: 30, max: 200, step: "0.5" }],
  },
  chest: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "chestCm", label: "Torace", unit: "cm", min: 30, max: 200, step: "0.5" }],
  },
  arms: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "armsCm", label: "Braccia", unit: "cm", min: 10, max: 80, step: "0.5" }],
  },
  thigh: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "thighCm", label: "Cosce", unit: "cm", min: 20, max: 120, step: "0.5" }],
  },
  calves: {
    kind: "biometric",
    category: "circumferences",
    fields: [{ name: "calvesCm", label: "Polpacci", unit: "cm", min: 15, max: 80, step: "0.5" }],
  },

  // Cardiovascular
  bloodPressure: {
    kind: "biometric",
    category: "cardiovascular",
    fields: [
      { name: "systolicBP", label: "Sistolica", unit: "mmHg", min: 60, max: 260, step: "1", isInt: true },
      { name: "diastolicBP", label: "Diastolica", unit: "mmHg", min: 30, max: 160, step: "1", isInt: true },
    ],
    composite: { left: "systolic", right: "diastolic" },
  },
  restingHR: {
    kind: "biometric",
    category: "cardiovascular",
    fields: [
      { name: "restingHR", label: "FC riposo", unit: "bpm", min: 25, max: 220, step: "1", isInt: true },
    ],
  },
  spo2: {
    kind: "biometric",
    category: "cardiovascular",
    fields: [{ name: "spo2", label: "SpO₂", unit: "%", min: 50, max: 100, step: "0.1" }],
  },
  hrv: {
    kind: "biometric",
    category: "cardiovascular",
    fields: [{ name: "hrv", label: "HRV", unit: "ms", min: 0, max: 300, step: "1", isInt: true }],
  },

  // Metabolic
  glucoseFasting: {
    kind: "biometric",
    category: "metabolic",
    fields: [
      { name: "glucoseFasting", label: "Glicemia digiuno", unit: "mg/dL", min: 30, max: 500, step: "1" },
    ],
  },
  glucosePostMeal: {
    kind: "biometric",
    category: "metabolic",
    fields: [
      { name: "glucosePostMeal", label: "Glicemia post-pasto", unit: "mg/dL", min: 30, max: 600, step: "1" },
    ],
  },
  bodyTempC: {
    kind: "biometric",
    category: "metabolic",
    fields: [{ name: "bodyTempC", label: "Temperatura", unit: "°C", min: 30, max: 45, step: "0.1" }],
  },
  ketones: {
    kind: "biometric",
    category: "metabolic",
    fields: [{ name: "ketones", label: "Chetoni", unit: "mmol/L", min: 0, max: 10, step: "0.1" }],
  },

  // Sleep
  sleepHours: {
    kind: "biometric",
    category: "sleep",
    fields: [
      { name: "sleepHours", label: "Ore di sonno", unit: "h", min: 0, max: 16, step: "0.25" },
    ],
  },
  sleepQuality: {
    kind: "biometric",
    category: "sleep",
    fields: [
      { name: "sleepQuality", label: "Qualità", unit: "/10", min: 1, max: 10, step: "1", isInt: true },
    ],
  },
  sleepAwakenings: {
    kind: "biometric",
    category: "sleep",
    fields: [
      { name: "sleepAwakenings", label: "Risvegli", min: 0, max: 20, step: "1", isInt: true },
    ],
  },

  // Activity
  steps: {
    kind: "biometric",
    category: "activity",
    fields: [{ name: "steps", label: "Passi", min: 0, max: 100_000, step: "1", isInt: true }],
  },
  caloriesBurned: {
    kind: "biometric",
    category: "activity",
    fields: [
      { name: "caloriesBurned", label: "Calorie", unit: "kcal", min: 0, max: 10_000, step: "1", isInt: true },
    ],
  },
  activeMinutes: {
    kind: "biometric",
    category: "activity",
    fields: [
      { name: "activeMinutes", label: "Minuti attivi", unit: "min", min: 0, max: 1440, step: "1", isInt: true },
    ],
  },
  distanceKm: {
    kind: "biometric",
    category: "activity",
    fields: [
      { name: "distanceKm", label: "Distanza", unit: "km", min: 0, max: 200, step: "0.1" },
    ],
  },

  // Energy level (top-level on BiometricInput, not nested)
  energyLevel: { kind: "energy-level", label: "Livello energia", min: 1, max: 10, isInt: true },

  // Symptom log
  mood: { kind: "symptom", field: "mood", label: "Umore", min: 1, max: 5 },
  energy: { kind: "symptom", field: "energy", label: "Energia", min: 1, max: 5 },
};
