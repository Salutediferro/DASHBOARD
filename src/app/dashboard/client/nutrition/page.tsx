"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SubstituteDialog } from "@/components/nutrition/substitute-dialog";
import { FoodPhotoCapture } from "@/components/nutrition/food-photo-capture";
import { NutritionLogHistory } from "@/components/nutrition/nutrition-log-history";
import type { NutritionPlan } from "@/lib/mock-nutrition";

function totals(meals: NutritionPlan["meals"]) {
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

function Progress({ label, current, target, unit }: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {Math.round(current)}
          {unit}
          <span className="text-muted-foreground">
            {" "}
            / {target}
            {unit}
          </span>
        </span>
      </div>
      <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ClientNutritionPage() {
  const [dateOffset, setDateOffset] = React.useState(0);
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [subOpen, setSubOpen] = React.useState(false);
  const [subFoodId, setSubFoodId] = React.useState<string | null>(null);
  const [subQty, setSubQty] = React.useState(0);

  const { data, isLoading } = useQuery<NutritionPlan | null>({
    queryKey: ["client-nutrition-active"],
    queryFn: async () => {
      const res = await fetch("/api/nutrition/active");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const today = new Date();
  today.setDate(today.getDate() + dateOffset);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6 pb-24">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Nutrizione
        </h1>
        <p className="text-muted-foreground">
          Nessun piano attivo. Nel frattempo puoi loggare i tuoi pasti con una foto.
        </p>
        <FoodPhotoCapture />
        <NutritionLogHistory />
      </div>
    );
  }

  const t = totals(data.meals);

  function toggleMeal(mealId: string) {
    setCompleted((s) => {
      const n = new Set(s);
      if (n.has(mealId)) n.delete(mealId);
      else {
        n.add(mealId);
        if ("vibrate" in navigator) navigator.vibrate(50);
      }
      return n;
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Nutrizione
        </h1>
        <p className="text-muted-foreground text-sm">{data.name}</p>
      </header>

      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDateOffset((d) => d - 1)}
          className="hover:bg-muted flex h-11 w-11 items-center justify-center rounded-md border"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-center text-sm font-medium">
          {today.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <button
          type="button"
          onClick={() => setDateOffset((d) => d + 1)}
          className="hover:bg-muted flex h-11 w-11 items-center justify-center rounded-md border"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Daily totals */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Progress label="Calorie" current={t.calories} target={data.targetCalories} unit="" />
          <Progress label="Proteine" current={t.protein} target={data.targetProtein} unit="g" />
          <Progress label="Carbo" current={t.carbs} target={data.targetCarbs} unit="g" />
          <Progress label="Grassi" current={t.fats} target={data.targetFats} unit="g" />
        </CardContent>
      </Card>

      {/* Meals */}
      {data.meals.map((meal) => {
        const done = completed.has(meal.id);
        const mt = meal.foods.reduce(
          (a, f) => ({
            cal: a.cal + f.calories,
            p: a.p + f.protein,
          }),
          { cal: 0, p: 0 },
        );
        return (
          <Card
            key={meal.id}
            className={cn(done && "border-primary/60 bg-primary/5")}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{meal.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    {meal.time ?? ""} · {mt.cal} kcal · P{mt.p.toFixed(0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMeal(meal.id)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                  )}
                  aria-label="Marca pasto"
                >
                  <Check className="h-6 w-6" />
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {meal.foods.map((f) => (
                  <li
                    key={f.id}
                    className="border-border flex items-center gap-2 rounded-md border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{f.foodName}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {f.quantityG}g · {f.calories} kcal · P{f.protein} C{f.carbs} F{f.fats}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubFoodId(f.foodId);
                        setSubQty(f.quantityG);
                        setSubOpen(true);
                      }}
                      className="hover:bg-muted flex h-9 items-center gap-1 rounded-md border px-2 text-xs"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Sostituisci
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <FoodPhotoCapture />

      <NutritionLogHistory />

      <SubstituteDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        foodId={subFoodId}
        quantityG={subQty}
        onChoose={() => toast.success("Sostituzione annotata")}
      />
    </div>
  );
}
