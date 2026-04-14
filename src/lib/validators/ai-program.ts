import { z } from "zod";

export const GOALS = [
  "HYPERTROPHY",
  "STRENGTH",
  "POWERLIFTING",
  "FAT_LOSS",
  "RECOMP",
  "ATHLETIC",
] as const;

export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"] as const;

export const SPLITS = [
  "FULL_BODY",
  "UPPER_LOWER",
  "PPL",
  "BRO_SPLIT",
  "AUTO",
] as const;

export const EQUIPMENT_PROFILES = [
  "FULL_GYM",
  "HOME_GYM",
  "DUMBBELLS_ONLY",
  "BODYWEIGHT",
] as const;

export const MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "ABS",
  "FULL_BODY",
  "CARDIO",
] as const;

export const generateProgramInputSchema = z.object({
  clientId: z.string().nullable().optional(),
  goal: z.enum(GOALS),
  level: z.enum(LEVELS),
  daysPerWeek: z.union([
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  split: z.enum(SPLITS),
  sessionDuration: z.union([
    z.literal(45),
    z.literal(60),
    z.literal(75),
    z.literal(90),
  ]),
  equipment: z.enum(EQUIPMENT_PROFILES),
  focusAreas: z.array(z.string()).default([]),
  injuries: z.string().optional(),
  notes: z.string().optional(),
});

export type GenerateProgramInput = z.infer<typeof generateProgramInputSchema>;

export const aiExerciseSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  sets: z.number().int().min(1).max(10),
  reps: z.string(),
  rpe: z.number().min(1).max(10).optional(),
  restSeconds: z.number().int().min(15).max(600),
  notes: z.string().optional(),
  supersetGroup: z.string().nullable().optional(),
});

export const aiDaySchema = z.object({
  name: z.string(),
  notes: z.string().optional(),
  exercises: z.array(aiExerciseSchema),
});

export const aiProgramSchema = z.object({
  name: z.string(),
  description: z.string(),
  days: z.array(aiDaySchema),
});

export type AIProgram = z.infer<typeof aiProgramSchema>;
export type AIDay = z.infer<typeof aiDaySchema>;
export type AIExercise = z.infer<typeof aiExerciseSchema>;

export const adjustProgramInputSchema = z.object({
  program: aiProgramSchema,
  instruction: z.string().min(3),
});

export const regenerateDayInputSchema = generateProgramInputSchema.extend({
  program: aiProgramSchema,
  dayIndex: z.number().int().min(0),
});
