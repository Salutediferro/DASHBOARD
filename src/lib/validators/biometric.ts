import { z } from "zod";

const numNullable = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().optional();

const intNullable = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().optional();

const timeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato richiesto HH:mm")
  .nullable()
  .optional();

export const biometricSchema = z.object({
  date: z.string().optional(),

  // Body composition
  heightCm: numNullable(80, 250),
  weightKg: numNullable(20, 300),
  bodyFatPercentage: numNullable(3, 60),
  muscleMassKg: numNullable(10, 120),
  bodyWaterPct: numNullable(20, 80),

  // Circumferences
  waistCm: numNullable(30, 200),
  hipsCm: numNullable(30, 200),
  chestCm: numNullable(30, 200),
  armsCm: numNullable(10, 80),
  thighCm: numNullable(20, 120),
  calvesCm: numNullable(15, 80),

  // Cardiovascular
  systolicBP: intNullable(60, 260),
  diastolicBP: intNullable(30, 160),
  restingHR: intNullable(25, 220),
  spo2: numNullable(50, 100),
  hrv: numNullable(0, 300),

  // Metabolic
  glucoseFasting: numNullable(30, 500),
  glucosePostMeal: numNullable(30, 600),
  ketones: numNullable(0, 10),
  bodyTempC: numNullable(30, 45),

  // Sleep
  sleepHours: numNullable(0, 16),
  sleepQuality: intNullable(1, 10),
  sleepBedtime: timeHHmm,
  sleepWakeTime: timeHHmm,
  sleepAwakenings: intNullable(0, 20),

  // Activity
  steps: intNullable(0, 100000),
  caloriesBurned: intNullable(0, 10000),
  activeMinutes: intNullable(0, 1440),
  distanceKm: numNullable(0, 200),

  // Subjective
  energyLevel: intNullable(1, 10),
  notes: z.string().nullable().optional(),

  // Legacy (tolerated, not surfaced in UI)
  bloodGlucose: numNullable(30, 500),
  waist: numNullable(30, 200),
  chest: numNullable(30, 200),
  armRight: numNullable(10, 80),
  thighRight: numNullable(20, 120),
});
