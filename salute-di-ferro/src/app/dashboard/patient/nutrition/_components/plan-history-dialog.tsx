"use client";

import * as React from "react";
import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mealSlotLabel } from "@/lib/nutrition-labels";
import type { NutritionPlan } from "@/lib/hooks/use-nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: NutritionPlan[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PlanHistoryDialog({ open, onOpenChange, plans }: Props) {
  const archived = plans.filter((p) => p.archivedAt != null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <History className="h-4 w-4" /> Piani precedenti
          </DialogTitle>
          <DialogDescription>
            Storico dei piani nutrizionali ricevuti, in sola lettura.
          </DialogDescription>
        </DialogHeader>
        {archived.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
            Nessun piano precedente.
          </p>
        ) : (
          <div className="-mx-1 flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-1">
            {archived.map((plan) => (
              <article
                key={plan.id}
                className="border-border rounded-lg border p-3"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{plan.title}</h3>
                    <p className="text-muted-foreground text-xs">
                      {plan.author.fullName}
                      {plan.author.specialties.length > 0 &&
                        ` · ${plan.author.specialties[0]}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Archiviato {fmt(plan.archivedAt!)}
                  </Badge>
                </header>
                {(plan.targetCaloriesKcal != null ||
                  plan.targetProteinG != null ||
                  plan.targetCarbsG != null ||
                  plan.targetFatG != null) && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {plan.targetCaloriesKcal != null &&
                      `${plan.targetCaloriesKcal} kcal`}
                    {plan.targetProteinG != null &&
                      ` · ${plan.targetProteinG}g P`}
                    {plan.targetCarbsG != null && ` · ${plan.targetCarbsG}g C`}
                    {plan.targetFatG != null && ` · ${plan.targetFatG}g G`}
                  </p>
                )}
                {plan.notes && (
                  <p className="text-foreground mt-2 whitespace-pre-wrap text-xs">
                    {plan.notes}
                  </p>
                )}
                {plan.meals.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                    {plan.meals.map((m, i) => (
                      <li key={i}>
                        <span className="font-medium">
                          {mealSlotLabel(m.slot)}: {m.title}
                        </span>
                        {m.description && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {m.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
