"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import type { FoodUnit } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FoodSearchModal } from "@/components/nutrition/food-search-modal";
import { SubstituteDialog } from "@/components/nutrition/substitute-dialog";
import {
  useNutritionPlan,
  useUpdateNutritionPlan,
  type FoodDTO,
  type PlanDTO,
} from "@/lib/hooks/use-nutrition";

const MEAL_PRESETS = [
  "Colazione",
  "Spuntino",
  "Pranzo",
  "Spuntino",
  "Cena",
  "Pre-nanna",
];

// Local draft shape — `id` is optional on new rows so a single payload
// can carry a mix of existing-and-being-edited and brand-new entries.
type DraftFood = {
  id?: string;
  foodId: string;
  quantity: number;
  unit: FoodUnit;
  notes: string | null;
  // Display copy of the food so we don't refetch on every keystroke.
  food: {
    id: string;
    name: string;
    category: string | null;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatsPer100g: number;
  };
};

type DraftMeal = {
  id?: string;
  name: string;
  orderIndex: number;
  time: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  foods: DraftFood[];
};

type Draft = {
  name: string;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  notes: string | null;
  isActive: boolean;
  meals: DraftMeal[];
};

function planToDraft(plan: PlanDTO): Draft {
  return {
    name: plan.name,
    targetCalories: plan.targetCalories,
    targetProtein: plan.targetProtein,
    targetCarbs: plan.targetCarbs,
    targetFats: plan.targetFats,
    notes: plan.notes,
    isActive: plan.isActive,
    meals: plan.meals.map((m) => ({
      id: m.id,
      name: m.name,
      orderIndex: m.orderIndex,
      time: m.time,
      targetCalories: m.targetCalories,
      targetProtein: m.targetProtein,
      targetCarbs: m.targetCarbs,
      targetFats: m.targetFats,
      foods: m.foods.map((f) => ({
        id: f.id,
        foodId: f.foodId,
        quantity: f.quantity,
        unit: f.unit,
        notes: f.notes,
        food: {
          id: f.food.id,
          name: f.food.name,
          category: f.food.category,
          caloriesPer100g: f.food.caloriesPer100g,
          proteinPer100g: f.food.proteinPer100g,
          carbsPer100g: f.food.carbsPer100g,
          fatsPer100g: f.food.fatsPer100g,
        },
      })),
    })),
  };
}

function macrosFor(food: DraftFood["food"], quantity: number, unit: FoodUnit) {
  if (unit !== "GRAMS" && unit !== "ML") {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }
  const k = quantity / 100;
  return {
    calories: Math.round(food.caloriesPer100g * k),
    protein: Math.round(food.proteinPer100g * k * 10) / 10,
    carbs: Math.round(food.carbsPer100g * k * 10) / 10,
    fats: Math.round(food.fatsPer100g * k * 10) / 10,
  };
}

function totalsForDraft(meals: DraftMeal[]) {
  return meals.reduce(
    (a, m) => {
      for (const f of m.foods) {
        const x = macrosFor(f.food, f.quantity, f.unit);
        a.calories += x.calories;
        a.protein += x.protein;
        a.carbs += x.carbs;
        a.fats += x.fats;
      }
      return a;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

function ProgressBar({
  current,
  target,
}: {
  current: number;
  target: number | null;
}) {
  if (!target || target <= 0) {
    return (
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full" />
    );
  }
  const pct = Math.min(100, (current / target) * 100);
  const color =
    pct >= 95 && pct <= 105
      ? "bg-emerald-500"
      : pct >= 80 && pct <= 110
        ? "bg-primary-500"
        : "bg-amber-500";
  return (
    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
      <div
        className={cn("h-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function CoachNutritionEditPage() {
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activeMealIdx, setActiveMealIdx] = React.useState<number | null>(null);
  const [subOpen, setSubOpen] = React.useState(false);
  const [subTarget, setSubTarget] = React.useState<{
    mealIdx: number;
    foodIdx: number;
  } | null>(null);

  const { data, isLoading } = useNutritionPlan(planId ?? null);
  const plan = data?.plan;
  const updateMutation = useUpdateNutritionPlan(planId ?? "");

  // Hydrate the local draft once after the initial fetch. We don't keep
  // it in sync with subsequent refetches — the draft IS the source of
  // truth until the user hits "Salva" and the server response replaces it.
  React.useEffect(() => {
    if (plan && !draft) setDraft(planToDraft(plan));
  }, [plan, draft]);

  if (isLoading || !plan || !draft) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const totals = totalsForDraft(draft.meals);

  function setDraftField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function updateMeal(idx: number, patch: Partial<DraftMeal>) {
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals.map((m, i) => (i === idx ? { ...m, ...patch } : m));
      return { ...d, meals };
    });
  }

  function addMeal() {
    setDraft((d) => {
      if (!d) return d;
      const name = MEAL_PRESETS[d.meals.length % MEAL_PRESETS.length] ?? "Pasto";
      return {
        ...d,
        meals: [
          ...d.meals,
          {
            name,
            orderIndex: d.meals.length,
            time: null,
            targetCalories: null,
            targetProtein: null,
            targetCarbs: null,
            targetFats: null,
            foods: [],
          },
        ],
      };
    });
  }

  function removeMeal(idx: number) {
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals
        .filter((_, i) => i !== idx)
        .map((m, i) => ({ ...m, orderIndex: i }));
      return { ...d, meals };
    });
  }

  function addFood(food: FoodDTO, quantity: number) {
    if (activeMealIdx == null) return;
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals.map((m, i) =>
        i === activeMealIdx
          ? {
              ...m,
              foods: [
                ...m.foods,
                {
                  foodId: food.id,
                  quantity,
                  unit: "GRAMS" as FoodUnit,
                  notes: null,
                  food: {
                    id: food.id,
                    name: food.name,
                    category: food.category,
                    caloriesPer100g: food.caloriesPer100g,
                    proteinPer100g: food.proteinPer100g,
                    carbsPer100g: food.carbsPer100g,
                    fatsPer100g: food.fatsPer100g,
                  },
                },
              ],
            }
          : m,
      );
      return { ...d, meals };
    });
  }

  function updateFoodQty(mealIdx: number, foodIdx: number, quantity: number) {
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals.map((m, mi) =>
        mi === mealIdx
          ? {
              ...m,
              foods: m.foods.map((f, fi) =>
                fi === foodIdx ? { ...f, quantity } : f,
              ),
            }
          : m,
      );
      return { ...d, meals };
    });
  }

  function removeFood(mealIdx: number, foodIdx: number) {
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals.map((m, mi) =>
        mi === mealIdx
          ? { ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx) }
          : m,
      );
      return { ...d, meals };
    });
  }

  function applySubstitute(
    mealIdx: number,
    foodIdx: number,
    sub: { id: string; name: string; category: string | null; quantity: number },
  ) {
    // The substitute API returns macros baked at quantity, but we store
    // the per-100g macros on the food row — so refetch the canonical food
    // record. Simpler: keep the original quantity and let the parent's
    // food-search-modal pattern be used for finer changes. Here we just
    // update foodId/name/category and quantity; calories etc. recompute
    // from per-100g once we re-resolve. For correctness we rely on the
    // server: pull the food on save. Store empty per-100g zeros and let
    // the next refetch fill them in.
    setDraft((d) => {
      if (!d) return d;
      const meals = d.meals.map((m, mi) =>
        mi === mealIdx
          ? {
              ...m,
              foods: m.foods.map((f, fi) =>
                fi === foodIdx
                  ? {
                      ...f,
                      foodId: sub.id,
                      quantity: sub.quantity,
                      // Stash a placeholder until the next save+refetch.
                      food: {
                        id: sub.id,
                        name: sub.name,
                        category: sub.category,
                        caloriesPer100g: f.food.caloriesPer100g,
                        proteinPer100g: f.food.proteinPer100g,
                        carbsPer100g: f.food.carbsPer100g,
                        fatsPer100g: f.food.fatsPer100g,
                      },
                    }
                  : f,
              ),
            }
          : m,
      );
      return { ...d, meals };
    });
  }

  async function save() {
    // Re-pin a snapshot — TS doesn't carry the early-return narrowing of
    // `draft` into this nested async closure.
    const d = draft;
    if (!d) return;
    try {
      const payload = {
        name: d.name,
        targetCalories: d.targetCalories,
        targetProtein: d.targetProtein,
        targetCarbs: d.targetCarbs,
        targetFats: d.targetFats,
        notes: d.notes,
        isActive: d.isActive,
        meals: d.meals.map((m) => ({
          id: m.id,
          name: m.name,
          orderIndex: m.orderIndex,
          time: m.time,
          targetCalories: m.targetCalories,
          targetProtein: m.targetProtein,
          targetCarbs: m.targetCarbs,
          targetFats: m.targetFats,
          foods: m.foods.map((f) => ({
            id: f.id,
            foodId: f.foodId,
            quantity: f.quantity,
            unit: f.unit,
            notes: f.notes,
          })),
        })),
      };
      const { plan: fresh } = await updateMutation.mutateAsync(payload);
      setDraft(planToDraft(fresh));
      toast.success("Piano salvato");
    } catch {
      // toast already shown by the hook
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      <Link
        href="/dashboard/coach/nutrition"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti i piani
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Input
                value={draft.name}
                onChange={(e) => setDraftField("name", e.target.value)}
                className="!h-auto max-w-md border-0 !px-0 !text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
              />
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                Paziente: <strong>{plan.patient.fullName}</strong>
                {draft.isActive && <Badge variant="default">Attivo</Badge>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/coach/nutrition/${plan.id}/shopping-list`}
                className="border-border hover:bg-muted focus-ring inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors md:h-8"
              >
                <ShoppingCart className="h-4 w-4" />
                Lista spesa
              </Link>
              <Button
                type="button"
                onClick={save}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <TargetField
              label="Kcal target"
              value={draft.targetCalories}
              onChange={(v) => setDraftField("targetCalories", v)}
            />
            <TargetField
              label="Proteine (g)"
              value={draft.targetProtein}
              onChange={(v) => setDraftField("targetProtein", v)}
            />
            <TargetField
              label="Carbo (g)"
              value={draft.targetCarbs}
              onChange={(v) => setDraftField("targetCarbs", v)}
            />
            <TargetField
              label="Grassi (g)"
              value={draft.targetFats}
              onChange={(v) => setDraftField("targetFats", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {draft.meals.map((meal, mealIdx) => {
          const mealMacros = meal.foods.reduce(
            (a, f) => {
              const x = macrosFor(f.food, f.quantity, f.unit);
              return {
                calories: a.calories + x.calories,
                protein: a.protein + x.protein,
                carbs: a.carbs + x.carbs,
                fats: a.fats + x.fats,
              };
            },
            { calories: 0, protein: 0, carbs: 0, fats: 0 },
          );
          return (
            <Card key={meal.id ?? `new-${mealIdx}`}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={meal.name}
                    onChange={(e) =>
                      updateMeal(mealIdx, { name: e.target.value })
                    }
                    className="!h-auto max-w-xs border-0 !px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  />
                  <Input
                    type="time"
                    value={meal.time ?? ""}
                    onChange={(e) =>
                      updateMeal(mealIdx, { time: e.target.value || null })
                    }
                    className="h-9 w-28"
                  />
                  <div className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {mealMacros.calories} kcal · P{mealMacros.protein.toFixed(0)} C{mealMacros.carbs.toFixed(0)} F{mealMacros.fats.toFixed(0)}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => removeMeal(mealIdx)}
                    title="Rimuovi pasto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ul className="flex flex-col gap-2">
                  {meal.foods.map((f, foodIdx) => {
                    const x = macrosFor(f.food, f.quantity, f.unit);
                    return (
                      <li
                        key={f.id ?? `new-${foodIdx}`}
                        className="border-border bg-card/40 flex items-center gap-3 rounded-md border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {f.food.name}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {x.calories} kcal · P{x.protein} C{x.carbs} F{x.fats}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={f.quantity}
                            onChange={(e) =>
                              updateFoodQty(
                                mealIdx,
                                foodIdx,
                                Math.max(0, Number(e.target.value)),
                              )
                            }
                            className="h-9 w-20 text-right"
                          />
                          <span className="text-muted-foreground text-xs">
                            g
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSubTarget({ mealIdx, foodIdx });
                            setSubOpen(true);
                          }}
                          title="Sostituisci"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeFood(mealIdx, foodIdx)}
                          title="Rimuovi"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  className="border-dashed"
                  onClick={() => {
                    setActiveMealIdx(mealIdx);
                    setSearchOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi alimento
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="border-dashed"
          onClick={addMeal}
        >
          <Plus className="h-4 w-4" />
          Aggiungi pasto
        </Button>
      </div>

      <div className="bg-card/95 border-border fixed inset-x-0 bottom-16 z-20 border-t p-3 backdrop-blur md:bottom-0">
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-3 px-4 md:px-8">
          {(
            [
              { label: "Kcal", current: totals.calories, target: draft.targetCalories },
              { label: "Proteine", current: totals.protein, target: draft.targetProtein },
              { label: "Carbo", current: totals.carbs, target: draft.targetCarbs },
              { label: "Grassi", current: totals.fats, target: draft.targetFats },
            ] as const
          ).map((m) => (
            <div key={m.label}>
              <div className="flex items-baseline justify-between text-[10px]">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold tabular-nums">
                  {Math.round(m.current)}
                  <span className="text-muted-foreground">
                    /{m.target ?? "—"}
                  </span>
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
          addFood(food, qty);
          setSearchOpen(false);
        }}
      />
      {subTarget && (
        <SubstituteDialog
          open={subOpen}
          onOpenChange={setSubOpen}
          foodId={
            draft.meals[subTarget.mealIdx]?.foods[subTarget.foodIdx]?.foodId ?? null
          }
          quantity={
            draft.meals[subTarget.mealIdx]?.foods[subTarget.foodIdx]?.quantity ?? 0
          }
          unit={
            draft.meals[subTarget.mealIdx]?.foods[subTarget.foodIdx]?.unit ?? "GRAMS"
          }
          onChoose={(s) =>
            applySubstitute(subTarget.mealIdx, subTarget.foodIdx, {
              id: s.id,
              name: s.name,
              category: s.category,
              quantity: s.quantity,
            })
          }
        />
      )}
    </div>
  );
}

function TargetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="mt-1"
      />
    </div>
  );
}
