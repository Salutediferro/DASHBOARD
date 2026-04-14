import { z } from "zod";

export const measurementsSchema = z.object({
  waist: z.number().nullable(),
  chest: z.number().nullable(),
  armRight: z.number().nullable(),
  armLeft: z.number().nullable(),
  thighRight: z.number().nullable(),
  thighLeft: z.number().nullable(),
  calf: z.number().nullable(),
});

export const createCheckInSchema = z.object({
  weightKg: z.number().min(30).max(250),
  measurements: measurementsSchema,
  frontPhotoUrl: z.string().nullable(),
  sidePhotoUrl: z.string().nullable(),
  backPhotoUrl: z.string().nullable(),
  clientNotes: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
});

export const updateCheckInSchema = z.object({
  coachFeedback: z.string().nullable().optional(),
  aiAnalysis: z.string().nullable().optional(),
  status: z.enum(["PENDING", "REVIEWED"]).optional(),
});
