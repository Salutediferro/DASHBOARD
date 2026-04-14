import { FOODS, getFoodById } from "@/lib/data/foods";

export type NutritionMealFoodItem = {
  id: string;
  foodId: string;
  foodName: string;
  category: string;
  quantityG: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type NutritionMealItem = {
  id: string;
  name: string;
  orderIndex: number;
  time: string | null;
  foods: NutritionMealFoodItem[];
};

export type NutritionPlan = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  meals: NutritionMealItem[];
};

export type NutritionPlanSummary = Omit<NutritionPlan, "meals"> & {
  mealCount: number;
  totalCalories: number;
};

function macros(foodId: string, quantityG: number) {
  const food = getFoodById(foodId);
  if (!food) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }
  const k = quantityG / 100;
  return {
    calories: Math.round(food.caloriesPer100g * k),
    protein: Math.round(food.proteinPer100g * k * 10) / 10,
    carbs: Math.round(food.carbsPer100g * k * 10) / 10,
    fats: Math.round(food.fatsPer100g * k * 10) / 10,
  };
}

export function makeMealFood(
  foodId: string,
  quantityG: number,
): NutritionMealFoodItem {
  const food = getFoodById(foodId);
  const m = macros(foodId, quantityG);
  return {
    id: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    foodId,
    foodName: food?.name ?? "Alimento",
    category: food?.category ?? "OTHER",
    quantityG,
    ...m,
  };
}

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

const defaultMeals = (): NutritionMealItem[] => [
  {
    id: "m-1",
    name: "Colazione",
    orderIndex: 0,
    time: "07:30",
    foods: [makeMealFood("fd-44", 80), makeMealFood("fd-29", 250), makeMealFood("fd-72", 120)],
  },
  {
    id: "m-2",
    name: "Spuntino",
    orderIndex: 1,
    time: "10:30",
    foods: [makeMealFood("fd-30", 150), makeMealFood("fd-83", 20)],
  },
  {
    id: "m-3",
    name: "Pranzo",
    orderIndex: 2,
    time: "13:00",
    foods: [
      makeMealFood("fd-1", 180),
      makeMealFood("fd-38", 100),
      makeMealFood("fd-57", 200),
      makeMealFood("fd-91", 10),
    ],
  },
  {
    id: "m-4",
    name: "Spuntino",
    orderIndex: 3,
    time: "16:30",
    foods: [makeMealFood("fd-96", 30), makeMealFood("fd-71", 150)],
  },
  {
    id: "m-5",
    name: "Cena",
    orderIndex: 4,
    time: "20:00",
    foods: [
      makeMealFood("fd-13", 150),
      makeMealFood("fd-68", 200),
      makeMealFood("fd-64", 100),
      makeMealFood("fd-91", 10),
    ],
  },
];

let PLANS: NutritionPlan[] = [
  {
    id: "np-1",
    name: "Massa 2800 kcal",
    clientId: "c1",
    clientName: "Luca Bianchi",
    startDate: dayAgo(10),
    endDate: null,
    isActive: true,
    createdAt: dayAgo(10),
    targetCalories: 2800,
    targetProtein: 180,
    targetCarbs: 320,
    targetFats: 80,
    meals: defaultMeals(),
  },
];

export function listPlans(): NutritionPlanSummary[] {
  return PLANS.map((p) => {
    const totalCalories = p.meals.reduce(
      (a, m) => a + m.foods.reduce((b, f) => b + f.calories, 0),
      0,
    );
    return {
      id: p.id,
      name: p.name,
      clientId: p.clientId,
      clientName: p.clientName,
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.isActive,
      createdAt: p.createdAt,
      targetCalories: p.targetCalories,
      targetProtein: p.targetProtein,
      targetCarbs: p.targetCarbs,
      targetFats: p.targetFats,
      mealCount: p.meals.length,
      totalCalories,
    };
  });
}

export function getPlan(id: string): NutritionPlan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

export function getActivePlanForClient(): NutritionPlan | null {
  return PLANS.find((p) => p.isActive) ?? null;
}

export function savePlan(plan: NutritionPlan): NutritionPlan {
  const i = PLANS.findIndex((p) => p.id === plan.id);
  if (i >= 0) PLANS[i] = plan;
  else PLANS = [...PLANS, plan];
  return plan;
}

export function createDraftPlan(): NutritionPlan {
  const id = `np-${Date.now()}`;
  const draft: NutritionPlan = {
    id,
    name: "Nuovo piano",
    clientId: null,
    clientName: null,
    startDate: new Date().toISOString(),
    endDate: null,
    isActive: false,
    createdAt: new Date().toISOString(),
    targetCalories: 2500,
    targetProtein: 170,
    targetCarbs: 280,
    targetFats: 75,
    meals: [
      {
        id: `m-${Date.now()}`,
        name: "Colazione",
        orderIndex: 0,
        time: "07:30",
        foods: [],
      },
    ],
  };
  PLANS = [...PLANS, draft];
  return draft;
}

export function aggregateShoppingList(
  planId: string,
  weeks = 1,
): { category: string; items: { foodId: string; name: string; totalGrams: number }[] }[] {
  const plan = getPlan(planId);
  if (!plan) return [];
  const totals = new Map<string, { name: string; category: string; grams: number }>();

  for (const meal of plan.meals) {
    for (const food of meal.foods) {
      const existing = totals.get(food.foodId);
      const grams = food.quantityG * 7 * weeks;
      if (existing) existing.grams += grams;
      else
        totals.set(food.foodId, {
          name: food.foodName,
          category: food.category,
          grams,
        });
    }
  }

  const byCategory = new Map<
    string,
    { foodId: string; name: string; totalGrams: number }[]
  >();
  for (const [foodId, v] of totals) {
    const arr = byCategory.get(v.category) ?? [];
    arr.push({ foodId, name: v.name, totalGrams: Math.round(v.grams) });
    byCategory.set(v.category, arr);
  }
  return Array.from(byCategory.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export const FOODS_EXPORT = FOODS;
