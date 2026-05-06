import { z } from "zod";
import { FoodUnit } from "@prisma/client";

export const FOOD_CATEGORIES = [
  "CARNI",
  "PESCE",
  "UOVA",
  "LATTICINI",
  "CEREALI",
  "LEGUMI",
  "VERDURE",
  "FRUTTA",
  "FRUTTA_SECCA",
  "OLI_GRASSI",
  "INTEGRATORI",
  "ALTRO",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  CARNI: "Carni",
  PESCE: "Pesce",
  UOVA: "Uova",
  LATTICINI: "Latticini",
  CEREALI: "Cereali",
  LEGUMI: "Legumi",
  VERDURE: "Verdure",
  FRUTTA: "Frutta",
  FRUTTA_SECCA: "Frutta secca",
  OLI_GRASSI: "Oli e grassi",
  INTEGRATORI: "Integratori",
  ALTRO: "Altro",
};

const nullableString = (max: number) =>
  z.preprocess((v) => {
    if (v == null) return null;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? null : t;
  }, z.string().max(max).nullable().optional());

// /api/nutrition/calculate — Mifflin-St Jeor + activity multiplier.
export const calculateSchema = z.object({
  weightKg: z.number().min(30).max(250),
  heightCm: z.number().min(120).max(230),
  age: z.number().int().min(14).max(90),
  sex: z.enum(["M", "F"]),
  activityLevel: z.enum([
    "SEDENTARY",
    "LIGHT",
    "MODERATE",
    "ACTIVE",
    "VERY_ACTIVE",
  ]),
  goal: z.enum(["CUTTING", "MAINTENANCE", "BULKING"]),
});
export type CalculateInput = z.infer<typeof calculateSchema>;

// Plan creation (coach side). The patientId must belong to a patient with
// an ACTIVE CareRelationship to the caller — checked at the service layer.
export const createPlanSchema = z.object({
  patientId: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  startDate: z.iso.date().optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

const mealFoodInputSchema = z.object({
  // Existing rows carry the DB id; new rows omit it.
  id: z.string().uuid().optional(),
  foodId: z.string().uuid(),
  quantity: z.number().min(0),
  unit: z.enum(FoodUnit).default("GRAMS"),
  notes: nullableString(200),
});

const mealInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  orderIndex: z.number().int().min(0),
  time: nullableString(8),
  targetCalories: z.number().int().min(0).max(20000).nullable().optional(),
  targetProtein: z.number().min(0).max(2000).nullable().optional(),
  targetCarbs: z.number().min(0).max(2000).nullable().optional(),
  targetFats: z.number().min(0).max(2000).nullable().optional(),
  foods: z.array(mealFoodInputSchema),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  patientId: z.string().uuid().optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().nullable().optional(),
  targetCalories: z.number().int().min(0).max(20000).nullable().optional(),
  targetProtein: z.number().min(0).max(2000).nullable().optional(),
  targetCarbs: z.number().min(0).max(2000).nullable().optional(),
  targetFats: z.number().min(0).max(2000).nullable().optional(),
  notes: nullableString(2000),
  isActive: z.boolean().optional(),
  meals: z.array(mealInputSchema).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const substituteSchema = z.object({
  foodId: z.string().uuid(),
  quantity: z.number().min(1),
  unit: z.enum(FoodUnit).default("GRAMS"),
});
export type SubstituteInput = z.infer<typeof substituteSchema>;
