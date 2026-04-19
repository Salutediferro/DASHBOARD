import { z } from "zod";

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

export const EQUIPMENTS = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "BAND",
  "KETTLEBELL",
  "OTHER",
] as const;

export const VISIBILITIES = ["PRIVATE", "ORGANIZATION", "GLOBAL"] as const;

export const createExerciseSchema = z.object({
  name: z.string().min(3).max(100),
  nameIt: z.string().min(3).max(100),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).default([]),
  equipment: z.enum(EQUIPMENTS),
  description: z.string().max(2000).optional().or(z.literal("")),
  steps: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  variants: z.array(z.string()).default([]),
  videoUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  visibility: z.enum(VISIBILITIES).default("PRIVATE"),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export const MUSCLE_LABELS: Record<(typeof MUSCLE_GROUPS)[number], string> = {
  CHEST: "Petto",
  BACK: "Schiena",
  SHOULDERS: "Spalle",
  BICEPS: "Bicipiti",
  TRICEPS: "Tricipiti",
  QUADS: "Quadricipiti",
  HAMSTRINGS: "Femorali",
  GLUTES: "Glutei",
  CALVES: "Polpacci",
  ABS: "Addome",
  FULL_BODY: "Full Body",
  CARDIO: "Cardio",
};

export const EQUIPMENT_LABELS: Record<(typeof EQUIPMENTS)[number], string> = {
  BARBELL: "Bilanciere",
  DUMBBELL: "Manubri",
  MACHINE: "Macchina",
  CABLE: "Cavi",
  BODYWEIGHT: "Corpo libero",
  BAND: "Elastico",
  KETTLEBELL: "Kettlebell",
  OTHER: "Altro",
};

export const MUSCLE_BADGE_CLASSES: Record<(typeof MUSCLE_GROUPS)[number], string> = {
  CHEST: "bg-red-500/10 text-red-500 border-red-500/20",
  BACK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  SHOULDERS: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  BICEPS: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  TRICEPS: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20",
  QUADS: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  HAMSTRINGS: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  GLUTES: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  CALVES: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ABS: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  FULL_BODY: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  CARDIO: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};
