"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Apple,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/brand/page-header";
import EmptyState from "@/components/brand/empty-state";
import { SubstituteDialog } from "@/components/nutrition/substitute-dialog";
import {
  useActiveNutritionPlan,
  type MealDTO,
} from "@/lib/hooks/use-nutrition";

function macrosFor(
  food: { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatsPer100g: number },
  quantity: number,
  unit: string,
) {
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

function totalsForPlan(meals: MealDTO[]) {
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

function MacroProgress({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number | null;
  unit: string;
}) {
  const safeTarget = target ?? 0;
  const pct = safeTarget > 0 ? Math.min(100, (current / safeTarget) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {Math.round(current)}
          {unit}
          <span className="text-muted-foreground">
            {" "}
            / {target ?? "—"}
            {target != null && unit}
          </span>
        </span>
      </div>
      <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary-500 h-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PatientNutritionPage() {
  const [dateOffset, setDateOffset] = React.useState(0);
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [subOpen, setSubOpen] = React.useState(false);
  const [subTarget, setSubTarget] = React.useState<{
    foodId: string;
    quantity: number;
    unit: string;
  } | null>(null);

  const { data, isLoading } = useActiveNutritionPlan();
  const plan = data?.plan ?? null;

  const today = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-6 pb-6 md:gap-8">
        <PageHeader
          title="Nutrizione"
          description="Il tuo piano alimentare attivo."
          sticky={false}
          className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        />
        <EmptyState
          icon={Apple}
          title="Nessun piano attivo"
          description="Quando il tuo coach ti assegnerà un piano alimentare, lo vedrai qui."
        />
      </div>
    );
  }

  const totals = totalsForPlan(plan.meals);

  function toggleMeal(mealId: string) {
    setCompleted((s) => {
      const n = new Set(s);
      if (n.has(mealId)) n.delete(mealId);
      else {
        n.add(mealId);
        if ("vibrate" in navigator) navigator.vibrate(30);
      }
      return n;
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader
        title="Nutrizione"
        description={plan.name}
        sticky={false}
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
      />

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDateOffset((d) => d - 1)}
          aria-label="Giorno precedente"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-center text-sm font-medium capitalize">
          {today.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDateOffset((d) => d + 1)}
          aria-label="Giorno successivo"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <MacroProgress
            label="Calorie"
            current={totals.calories}
            target={plan.targetCalories}
            unit=""
          />
          <MacroProgress
            label="Proteine"
            current={totals.protein}
            target={plan.targetProtein}
            unit="g"
          />
          <MacroProgress
            label="Carboidrati"
            current={totals.carbs}
            target={plan.targetCarbs}
            unit="g"
          />
          <MacroProgress
            label="Grassi"
            current={totals.fats}
            target={plan.targetFats}
            unit="g"
          />
        </CardContent>
      </Card>

      {plan.meals.map((meal) => {
        const done = completed.has(meal.id);
        const mealMacros = meal.foods.reduce(
          (a, f) => {
            const x = macrosFor(f.food, f.quantity, f.unit);
            return {
              calories: a.calories + x.calories,
              protein: a.protein + x.protein,
            };
          },
          { calories: 0, protein: 0 },
        );
        return (
          <Card
            key={meal.id}
            className={cn(done && "border-primary-500/60 bg-primary-500/5")}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{meal.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    {meal.time ?? "—"} · {mealMacros.calories} kcal · P{mealMacros.protein.toFixed(0)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={done ? "default" : "outline"}
                  size="icon-lg"
                  onClick={() => toggleMeal(meal.id)}
                  aria-label={done ? "Pasto consumato" : "Marca pasto"}
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
              {meal.foods.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  Nessun alimento previsto.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {meal.foods.map((f) => {
                    const x = macrosFor(f.food, f.quantity, f.unit);
                    return (
                      <li
                        key={f.id}
                        className="border-border bg-card/40 flex items-center gap-2 rounded-md border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {f.food.name}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {f.quantity}{f.unit === "GRAMS" ? "g" : f.unit === "ML" ? "ml" : ` ${f.unit.toLowerCase()}`} · {x.calories} kcal · P{x.protein} C{x.carbs} F{x.fats}
                          </p>
                          {f.notes && (
                            <p className="text-muted-foreground mt-1 text-[10px] italic">
                              {f.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSubTarget({
                              foodId: f.foodId,
                              quantity: f.quantity,
                              unit: f.unit,
                            });
                            setSubOpen(true);
                          }}
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          Sostituisci
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      <SubstituteDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        foodId={subTarget?.foodId ?? null}
        quantity={subTarget?.quantity ?? 0}
        unit={subTarget?.unit ?? "GRAMS"}
        onChoose={() =>
          toast.success("Sostituzione annotata — chiedi conferma al coach")
        }
      />
    </div>
  );
}

