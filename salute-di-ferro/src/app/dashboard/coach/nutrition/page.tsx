"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, Plus, ShoppingCart, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/brand/page-header";
import EmptyState from "@/components/brand/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientPickerDialog } from "@/components/nutrition/patient-picker-dialog";
import {
  useCreateNutritionPlan,
  useNutritionPlans,
  type PlanDTO,
} from "@/lib/hooks/use-nutrition";

function planTotals(plan: PlanDTO) {
  let calories = 0;
  for (const meal of plan.meals) {
    for (const mf of meal.foods) {
      if (mf.unit === "GRAMS" || mf.unit === "ML") {
        calories += (mf.food.caloriesPer100g * mf.quantity) / 100;
      }
    }
  }
  return Math.round(calories);
}

export default function CoachNutritionListPage() {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const { data, isLoading } = useNutritionPlans();
  const plans = data?.plans ?? [];
  const createMutation = useCreateNutritionPlan();

  function handlePickPatient(patient: { id: string; fullName: string }) {
    createMutation.mutate(
      { patientId: patient.id, name: `Piano per ${patient.fullName}` },
      {
        onSuccess: ({ plan }) => {
          router.push(`/dashboard/coach/nutrition/${plan.id}/edit`);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6 md:gap-8">
      <PageHeader
        title="Nutrizione"
        description="Crea e gestisci i piani alimentari dei tuoi assistiti"
        sticky={false}
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            Nuovo piano
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Apple}
          title="Nessun piano alimentare ancora"
          description="Crea il primo piano per uno dei tuoi assistiti."
          action={
            <Button type="button" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuovo piano
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const totalCals = planTotals(plan);
            return (
              <Card
                key={plan.id}
                className="hover:border-primary-500/50 transition-colors"
              >
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary-500/10 text-primary-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                      <Apple className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{plan.name}</h3>
                      <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                        <User className="h-3 w-3" />
                        {plan.patient.fullName}
                      </p>
                    </div>
                    {plan.isActive && (
                      <Badge className="shrink-0">Attivo</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Stat label="Kcal" value={plan.targetCalories ?? totalCals} />
                    <Stat
                      label="P"
                      value={plan.targetProtein ?? null}
                      suffix="g"
                    />
                    <Stat
                      label="C"
                      value={plan.targetCarbs ?? null}
                      suffix="g"
                    />
                    <Stat
                      label="F"
                      value={plan.targetFats ?? null}
                      suffix="g"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/coach/nutrition/${plan.id}/edit`}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-ring flex h-9 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors"
                    >
                      Modifica
                    </Link>
                    <Link
                      href={`/dashboard/coach/nutrition/${plan.id}/shopping-list`}
                      className="border-border hover:bg-muted focus-ring flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
                      title="Lista spesa"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PatientPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickPatient}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">
        {value == null ? "—" : value}
        {value != null && suffix}
      </p>
    </div>
  );
}
