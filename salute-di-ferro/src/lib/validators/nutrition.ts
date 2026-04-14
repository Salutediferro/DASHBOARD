import { z } from "zod";

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

export const mealFoodSchema = z.object({
  id: z.string(),
  foodId: z.string(),
  foodName: z.string(),
  category: z.string(),
  quantityG: z.number().min(0),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
});

export const mealSchema = z.object({
  id: z.string(),
  name: z.string(),
  orderIndex: z.number().int(),
  time: z.string().nullable(),
  foods: z.array(mealFoodSchema),
});

export const planSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  clientId: z.string().nullable(),
  clientName: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  targetCalories: z.number(),
  targetProtein: z.number(),
  targetCarbs: z.number(),
  targetFats: z.number(),
  meals: z.array(mealSchema),
});

export const substituteSchema = z.object({
  foodId: z.string(),
  quantityG: z.number().min(1),
});
