"use client";

import * as React from "react";
import { Loader2, CalendarDays, Camera } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FOOD_CONFIDENCE_CLASSES,
  FOOD_CONFIDENCE_LABELS,
} from "@/lib/validators/nutrition-log";
import {
  useNutritionLogs,
  type NutritionLogRow,
} from "@/lib/hooks/use-nutrition-logs";

export function NutritionLogHistory() {
  const [date, setDate] = React.useState<string>("");
  const [active, setActive] = React.useState<NutritionLogRow | null>(null);

  const filters = React.useMemo(() => {
    if (!date) return undefined;
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return { from: d.toISOString(), to: next.toISOString() };
  }, [date]);

  const { data, isLoading } = useNutritionLogs(filters);
  const logs = data?.logs ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          I tuoi pasti
        </h2>
        <div className="flex items-center gap-2">
          <CalendarDays className="text-muted-foreground h-4 w-4" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-auto"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              reset
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            <Camera className="h-8 w-8" />
            Nessun pasto fotografato{date ? " in questa data" : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => setActive(log)}
              className="group relative overflow-hidden rounded-md border text-left"
            >
              {}
              <img
                src={log.photoUrl}
                alt="Pasto"
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="from-background/95 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2">
                <p className="text-[10px] opacity-80">
                  {new Date(log.loggedAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {Math.round(log.totalCalories)} kcal
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {new Date(active.loggedAt).toLocaleString("it-IT", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </DialogTitle>
              </DialogHeader>
              {}
              <img
                src={active.photoUrl}
                alt="Pasto"
                className="aspect-video w-full rounded-md object-cover"
              />
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="kcal" value={active.totalCalories} />
                <Stat label="P" value={active.totalProtein} />
                <Stat label="C" value={active.totalCarbs} />
                <Stat label="F" value={active.totalFats} />
              </div>
              <ul className="flex flex-col gap-1.5">
                {active.foods.map((f) => (
                  <li
                    key={f.id}
                    className="border-border flex items-center gap-2 rounded-md border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {Math.round(f.estimatedGrams)}g · {Math.round(f.calories)} kcal ·
                        P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fats)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px]",
                        FOOD_CONFIDENCE_CLASSES[f.confidence],
                      )}
                    >
                      {FOOD_CONFIDENCE_LABELS[f.confidence]}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-md p-2">
      <p className="text-muted-foreground text-[10px] uppercase">{label}</p>
      <p className="text-sm font-bold tabular-nums">{Math.round(value)}</p>
    </div>
  );
}
