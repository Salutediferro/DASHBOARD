import { z } from "zod";

/**
 * Validators for the nutrition feature: plans (doctor-authored) and
 * diary entries (patient-authored). Stored types live in @prisma/client;
 * these zod schemas guard the API boundary.
 */

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD richiesto");

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Data non valida");

export const MEAL_SLOTS = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "EVENING_SNACK",
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * One entry inside a NutritionPlan.meals JSON column. Doctor-authored;
 * patient renders read-only. Items are arbitrary food descriptions —
 * we don't try to enforce a food database.
 */
export const planMealSchema = z.object({
  slot: z.enum(MEAL_SLOTS),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        quantity: z.string().trim().max(80).optional().nullable(),
        notes: z.string().trim().max(400).optional().nullable(),
      }),
    )
    .max(40)
    .optional()
    .default([]),
});

export type PlanMeal = z.infer<typeof planMealSchema>;

const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().optional();

const optionalFloat = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().optional();

/**
 * Body for creating a new plan. Server selects the patient explicitly so
 * the doctor cannot accidentally write for someone they aren't linked to —
 * the API enforces an active CareRelationship.
 */
export const planCreateSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(8000).nullable().optional(),
  targetCaloriesKcal: optionalInt(0, 20000),
  targetProteinG: optionalFloat(0, 2000),
  targetCarbsG: optionalFloat(0, 2000),
  targetFatG: optionalFloat(0, 2000),
  meals: z.array(planMealSchema).max(20).optional().default([]),
  startDate: dateOnly.nullable().optional(),
  endDate: dateOnly.nullable().optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;

/** Body for editing an existing plan. patientId is immutable. */
export const planUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(8000).nullable().optional(),
  targetCaloriesKcal: optionalInt(0, 20000),
  targetProteinG: optionalFloat(0, 2000),
  targetCarbsG: optionalFloat(0, 2000),
  targetFatG: optionalFloat(0, 2000),
  meals: z.array(planMealSchema).max(20).optional(),
  startDate: dateOnly.nullable().optional(),
  endDate: dateOnly.nullable().optional(),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

// ---- Diary ----

export const diaryEntryCreateSchema = z.object({
  consumedAt: isoDateTime,
  mealSlot: z.enum(MEAL_SLOTS),
  description: z.string().trim().min(1).max(400),
  caloriesKcal: z.number().int().min(0).max(20000),
  proteinG: optionalFloat(0, 2000),
  carbsG: optionalFloat(0, 2000),
  fatG: optionalFloat(0, 2000),
});

export type DiaryEntryCreateInput = z.infer<typeof diaryEntryCreateSchema>;

export const diaryEntryUpdateSchema = diaryEntryCreateSchema.partial();
export type DiaryEntryUpdateInput = z.infer<typeof diaryEntryUpdateSchema>;
