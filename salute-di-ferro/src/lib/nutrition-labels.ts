import type { MealSlot } from "@/lib/validators/nutrition";

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: "Colazione",
  MORNING_SNACK: "Spuntino mattutino",
  LUNCH: "Pranzo",
  AFTERNOON_SNACK: "Spuntino pomeridiano",
  DINNER: "Cena",
  EVENING_SNACK: "Spuntino serale",
};

export const MEAL_SLOTS_ORDERED: MealSlot[] = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "EVENING_SNACK",
];

export function mealSlotLabel(slot: MealSlot): string {
  return MEAL_SLOT_LABELS[slot];
}

/** Map an HH (0–23) to the meal slot that best matches that hour. */
export function defaultMealSlotForHour(hour: number): MealSlot {
  if (hour < 9) return "BREAKFAST";
  if (hour < 12) return "MORNING_SNACK";
  if (hour < 15) return "LUNCH";
  if (hour < 18) return "AFTERNOON_SNACK";
  if (hour < 22) return "DINNER";
  return "EVENING_SNACK";
}
