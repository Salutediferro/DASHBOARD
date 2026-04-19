import { z } from "zod";

export const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  orderIndex: z.number().int(),
  sets: z.number().int().min(1),
  reps: z.string().min(1),
  rpe: z.number().nullable(),
  tempo: z.string().nullable(),
  restSeconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  supersetGroup: z.string().nullable(),
});

export const workoutDaySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  notes: z.string().nullable(),
  exercises: z.array(workoutExerciseSchema),
});

export const workoutTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable(),
  type: z.enum(["STRENGTH", "HYPERTROPHY", "POWERLIFTING", "CONDITIONING", "CUSTOM"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  tags: z.array(z.string()),
  isPublic: z.boolean(),
  createdAt: z.string(),
  days: z.array(workoutDaySchema),
});

export const assignSchema = z.object({
  clientId: z.string(),
  startDate: z.string(),
  durationWeeks: z.number().int().min(1).max(52),
});
