import { z } from "zod";

export const biometricSchema = z.object({
  date: z.string().optional(),
  weightKg: z.number().min(30).max(250).nullable().optional(),
  bodyFatPercentage: z.number().min(3).max(60).nullable().optional(),
  systolicBP: z.number().int().min(60).max(220).nullable().optional(),
  diastolicBP: z.number().int().min(40).max(140).nullable().optional(),
  restingHR: z.number().int().min(30).max(200).nullable().optional(),
  hrv: z.number().min(0).max(300).nullable().optional(),
  bloodGlucose: z.number().min(30).max(500).nullable().optional(),
  energyLevel: z.number().int().min(1).max(10).nullable().optional(),
  sleepHours: z.number().min(0).max(16).nullable().optional(),
  sleepQuality: z.number().int().min(1).max(10).nullable().optional(),
  steps: z.number().int().min(0).max(100000).nullable().optional(),
  notes: z.string().nullable().optional(),
  waist: z.number().nullable().optional(),
  chest: z.number().nullable().optional(),
  armRight: z.number().nullable().optional(),
  thighRight: z.number().nullable().optional(),
});
