"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowLeftRight,
  Loader2,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodSearchModal } from "@/components/nutrition/food-search-modal";
import { SubstituteDialog } from "@/components/nutrition/substitute-dialog";
import { makeMealFood, type NutritionPlan } from "@/lib/mock-nutrition";
import type { FoodItem } from "@/lib/data/foods";

const MEAL_PRESETS = [
  "Colazione",
  "Spuntino",
  "Pranzo",
  "Spuntino",
  "Cena",
  "Pre-nanna",
];

function computeTotals(meals: NutritionPlan["meals"]) {
  return meals.reduce(
    (a, m) => {
      for (const f of m.foods) {
        a.calories += f.calories;
        a.protein += f.protein;
        a.carbs += f.carbs;
        a.fats += f.fats;
      }
      return a;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

function mealTotal(foods: NutritionPlan["meals"][number]["foods"]) {
  return foods.reduce(
    (a, f) => ({
      calories: a.calories + f.calories,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fats: a.fats + f.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  const color =
    pct >= 95 && pct <= 105
      ? "bg-green-500"
      : pct >= 80 && pct <= 110
        ? "bg-primary"
        : "bg-yellow-500";
  return (
    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
      <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function NutritionEditPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = React.useState<NutritionPlan | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activeMealId, setActiveMealId] = React.useState<string | null>(null);
  const [subOpen, setSubOpen] = React.useState(false);
  const [subTarget, setSubTarget] = React.useState<{
    mealId: string;
    mealFoodId: string;
    foodId: string;
    quantityG: number;
  } | null>(null);

  const { data, isLoading } = useQuery<NutritionPlan>({
    queryKey: ["nutrition-plan", id],
    queryFn: async () => {
      const res = await fetch(`/api/nutrition/plans/${id}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  React.useEffect(() => {
    if (data && !plan) setPlan(data);
  }, [data, plan]);

  const saveMutation = useMutation({
    mutationFn: async (p: NutritionPlan) => {
      const res = await fetch(`/api/nutrition/plans/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      return res.json();
    },
    onSuccess: () => toast.success("Piano salvato"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !plan) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const totals = computeTotals(plan.meals);

  function addMeal() {
    if (!plan) return;
    const name = MEAL_PRESETS[plan.meals.length % MEAL_PRESETS.length] ?? "Pasto";
    setPlan({
      ...plan,
      meals: [
        ...plan.meals,
        {
          id: `m-${Date.now()}`,
          name,
          orderIndex: plan.meals.length,
          time: null,
          foods: [],
        },
      ],
    });
  }

  function removeMeal(mealId: string) {
    if (!plan) return;
    setPlan({ ...plan, meals: plan.meals.filter((m) => m.id !== mealId) });
  }

  function renameMeal(mealId: string, name: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      meals: plan.meals.map((m) => (m.id === mealId ? { ...m, name } : m)),
    });
  }

  function setMealTime(mealId: string, time: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === mealId ? { ...m, time: time || null } : m,
      ),
    });
  }

  function addFoodToMeal(food: FoodItem, quantityG: number) {
    if (!plan || !activeMealId) return;
    const mf = makeMealFood(food.id, quantityG);
    setPlan({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === activeMealId ? { ...m, foods: [...m.foods, mf] } : m,
      ),
    });
  }

  function updateFoodQty(mealId: string, mealFoodId: string, quantityG: number) {
    if (!plan) return;
    setPlan({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              foods: m.foods.map((f) => {
                if (f.id !== mealFoodId) return f;
                const k = quantityG / 100;
                const orig = f.calories / Math.max(f.quantityG, 1) * 100;
                // recompute from base food via ratio
                const ratio = quantityG / f.quantityG;
                return {
                  ...f,
                  quantityG,
                  calories: Math.round(f.calories * ratio),
                  protein: Math.round(f.protein * ratio * 10) / 10,
                  carbs: Math.round(f.carbs * ratio * 10) / 10,
                  fats: Math.round(f.fats * ratio * 10) / 10,
                };
              }),
            }
          : m,
      ),
    });
  }

  function removeFood(mealId: string, mealFoodId: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === mealId
          ? { ...m, foods: m.foods.filter((f) => f.id !== mealFoodId) }
          : m,
      ),
    });
  }

  function replaceFood(mealId: string, mealFoodId: string, sub: {
    id: string;
    name: string;
    category: string;
    quantityG: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) {
    if (!plan) return;
    setPlan({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              foods: m.foods.map((f) =>
                f.id === mealFoodId
                  ? {
                      ...f,
                      foodId: sub.id,
                      foodName: sub.name,
                      category: sub.category,
                      quantityG: sub.quantityG,
                      calories: sub.calories,
                      protein: sub.protein,
                      carbs: sub.carbs,
                      fats: sub.fats,
                    }
                  : f,
              ),
            }
          : m,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      <Link
        href="/dashboard/coach/nutrition"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti i piani
      </Link>

      {/* HEADER */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Input
              value={plan.name}
              onChange={(e) => setPlan({ ...plan, name: e.target.value })}
              className="font-heading !h-auto max-w-sm border-0 !px-0 !text-2xl font-semibold shadow-none focus-visible:ring-0"
            />
            <div className="flex gap-2">
              <Link
                href={`/dashboard/coach/nutrition/${plan.id}/shopping-list`}
                className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
              >
                <ShoppingCart className="h-4 w-4" />
                Lista spesa
              </Link>
              <button
                type="button"
                onClick={() => saveMutation.mutate(plan)}
                disabled={saveMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salva
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { key: "targetCalories", label: "Kcal" },
              { key: "targetProtein", label: "Proteine (g)" },
              { key: "targetCarbs", label: "Carbo (g)" },
              { key: "targetFats", label: "Grassi (g)" },
            ].map((m) => (
              <div key={m.key}>
                <Label className="text-xs">{m.label}</Label>
                <Input
                  type="number"
                  value={(plan as Record<string, unknown>)[m.key] as number}
                  onChange={(e) =>
                    setPlan({ ...plan, [m.key]: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MEALS */}
      <div className="flex flex-col gap-4">
        {plan.meals.map((meal) => {
          const mt = mealTotal(meal.foods);
          return (
            <Card key={meal.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={meal.name}
                    onChange={(e) => renameMeal(meal.id, e.target.value)}
                    className="!h-auto max-w-xs border-0 !px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  />
                  <Input
                    type="time"
                    value={meal.time ?? ""}
                    onChange={(e) => setMealTime(meal.id, e.target.value)}
                    className="h-9 w-28"
                  />
                  <div className="text-muted-foreground ml-auto text-xs">
                    {mt.calories} kcal · P{mt.protein.toFixed(0)} C{mt.carbs.toFixed(0)} F{mt.fats.toFixed(0)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMeal(meal.id)}
                    className="hover:bg-destructive/20 text-destructive flex h-9 w-9 items-center justify-center rounded-md border"
                    title="Rimuovi pasto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <ul className="flex flex-col gap-2">
                  {meal.foods.map((f) => (
                    <li
                      key={f.id}
                      className="border-border flex items-center gap-3 rounded-md border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {f.foodName}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {f.calories} kcal · P{f.protein} C{f.carbs} F{f.fats}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={f.quantityG}
                          onChange={(e) =>
                            updateFoodQty(meal.id, f.id, Number(e.target.value))
                          }
                          className="h-9 w-20 text-right"
                        />
                        <span className="text-muted-foreground text-xs">g</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubTarget({
                            mealId: meal.id,
                            mealFoodId: f.id,
                            foodId: f.foodId,
                            quantityG: f.quantityG,
                          });
                          setSubOpen(true);
                        }}
                        className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md"
                        title="Sostituisci"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFood(meal.id, f.id)}
                        className="hover:bg-destructive/20 text-destructive flex h-9 w-9 items-center justify-center rounded-md"
                        title="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMealId(meal.id);
                    setSearchOpen(true);
                  }}
                  className="text-muted-foreground hover:bg-muted flex h-10 items-center justify-center gap-1 rounded-md border border-dashed text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi alimento
                </button>
              </CardContent>
            </Card>
          );
        })}

        <button
          type="button"
          onClick={addMeal}
          className="text-muted-foreground hover:bg-muted flex h-12 items-center justify-center gap-1 rounded-md border border-dashed text-sm"
        >
          <Plus className="h-4 w-4" />
          Aggiungi pasto
        </button>
      </div>

      {/* STICKY TOTALS BAR */}
      <div className="bg-card/95 border-border fixed inset-x-0 bottom-16 z-20 border-t p-3 backdrop-blur md:bottom-0">
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-3 px-4 md:px-8">
          {[
            { label: "Kcal", current: totals.calories, target: plan.targetCalories },
            { label: "Proteine", current: totals.protein, target: plan.targetProtein },
            { label: "Carbo", current: totals.carbs, target: plan.targetCarbs },
            { label: "Grassi", current: totals.fats, target: plan.targetFats },
          ].map((m) => (
            <div key={m.label}>
              <div className="flex items-baseline justify-between text-[10px]">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold tabular-nums">
                  {Math.round(m.current)}
                  <span className="text-muted-foreground">/{m.target}</span>
                </span>
              </div>
              <ProgressBar current={m.current} target={m.target} />
            </div>
          ))}
        </div>
      </div>

      <FoodSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onPick={(food, qty) => {
          addFoodToMeal(food, qty);
          setSearchOpen(false);
        }}
      />
      <SubstituteDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        foodId={subTarget?.foodId ?? null}
        quantityG={subTarget?.quantityG ?? 0}
        onChoose={(s) => {
          if (!subTarget) return;
          replaceFood(subTarget.mealId, subTarget.mealFoodId, s);
        }}
      />
    </div>
  );
}
