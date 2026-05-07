import * as React from "react";
import { Apple, Coffee, Cookie, Soup, UtensilsCrossed, type LucideIcon } from "lucide-react";

import type { MealSlot } from "@/lib/validators/nutrition";

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: "Colazione",
  MORNING_SNACK: "Spuntino mattutino",
  LUNCH: "Pranzo",
  AFTERNOON_SNACK: "Spuntino pomeridiano",
  DINNER: "Cena",
  EVENING_SNACK: "Spuntino serale",
};

/**
 * Short variants used wherever vertical/horizontal real estate is tight
 * (slot pills, meal-card headers). Both snacks collapse to "Spuntino" —
 * the time-of-day disambiguates them in context.
 */
export const MEAL_SLOT_SHORT_LABELS: Record<MealSlot, string> = {
  BREAKFAST: "Colazione",
  MORNING_SNACK: "Spuntino",
  LUNCH: "Pranzo",
  AFTERNOON_SNACK: "Spuntino",
  DINNER: "Cena",
  EVENING_SNACK: "Spuntino",
};

/**
 * Conventional Italian meal times. Used as default `consumedAt` when a
 * patient adds an entry from a specific meal-slot card, and as the time
 * shown next to the slot name in the diary UI.
 */
export const MEAL_SLOT_DEFAULT_TIMES: Record<MealSlot, string> = {
  BREAKFAST: "07:30",
  MORNING_SNACK: "10:00",
  LUNCH: "13:00",
  AFTERNOON_SNACK: "16:30",
  DINNER: "20:00",
  EVENING_SNACK: "22:30",
};

const MEAL_SLOT_ICONS: Record<MealSlot, LucideIcon> = {
  BREAKFAST: Coffee,
  MORNING_SNACK: Apple,
  LUNCH: UtensilsCrossed,
  AFTERNOON_SNACK: Cookie,
  DINNER: Soup,
  EVENING_SNACK: Cookie,
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

export function mealSlotShortLabel(slot: MealSlot): string {
  return MEAL_SLOT_SHORT_LABELS[slot];
}

export function defaultTimeForMealSlot(slot: MealSlot): string {
  return MEAL_SLOT_DEFAULT_TIMES[slot];
}

/**
 * Stable wrapper component that renders the right Lucide icon for a meal
 * slot. Using a component (not a `const Icon = mealSlotIcon(slot)` alias
 * at call sites) keeps `react-hooks/static-components` happy — the rule
 * flags any pattern that looks like an inline component declaration,
 * even when the reference is actually stable.
 */
export function MealSlotIcon({
  slot,
  className,
}: {
  slot: MealSlot;
  className?: string;
}) {
  return React.createElement(MEAL_SLOT_ICONS[slot], { className });
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
