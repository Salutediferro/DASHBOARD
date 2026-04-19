import { z } from "zod";

export const foodConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const analyzedFoodSchema = z.object({
  name: z.string().min(1).max(200),
  estimatedGrams: z.number().min(0).max(5000),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(1000),
  fats: z.number().min(0).max(500),
  confidence: foodConfidenceSchema,
});

export const analyzeResponseSchema = z.object({
  foods: z.array(analyzedFoodSchema),
  totalCalories: z.number().min(0),
  totalProtein: z.number().min(0),
  totalCarbs: z.number().min(0),
  totalFats: z.number().min(0),
});

export const analyzeRequestSchema = z.object({
  photoUrl: z.string().url(),
});

export const createLogRequestSchema = z.object({
  photoUrl: z.string().url(),
  loggedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
  foods: z.array(analyzedFoodSchema).min(1),
});

export type AnalyzedFood = z.infer<typeof analyzedFoodSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type CreateLogRequest = z.infer<typeof createLogRequestSchema>;

export const FOOD_CONFIDENCE_LABELS: Record<z.infer<typeof foodConfidenceSchema>, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Bassa",
};

export const FOOD_CONFIDENCE_CLASSES: Record<z.infer<typeof foodConfidenceSchema>, string> = {
  HIGH: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  LOW: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};
