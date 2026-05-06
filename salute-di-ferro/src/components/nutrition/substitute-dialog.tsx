"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
} from "@/lib/validators/nutrition";
import { readApiError } from "@/lib/api-error";

export type Substitute = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type Response = {
  original: Substitute;
  substitutes: Substitute[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  foodId: string | null;
  quantity: number;
  unit?: string;
  onChoose: (s: Substitute) => void;
};

export function SubstituteDialog({
  open,
  onOpenChange,
  foodId,
  quantity,
  unit = "GRAMS",
  onChoose,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["nutrition", "substitute", foodId, quantity, unit] as const,
    enabled: open && !!foodId,
    queryFn: async (): Promise<Response> => {
      const res = await fetch("/api/nutrition/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId, quantity, unit }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore"));
      return res.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sostituzioni suggerite</DialogTitle>
          <DialogDescription>
            Alternative con macro simili nella stessa categoria.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.substitutes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessuna alternativa trovata.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.substitutes.map((s) => {
              const label = s.category
                ? (FOOD_CATEGORY_LABELS[s.category as FoodCategory] ?? s.category)
                : "";
              return (
                <li
                  key={s.id}
                  className="border-border bg-card/40 flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {label && `${label} · `}
                      {s.quantity}g · {s.calories} kcal · P{s.protein} C{s.carbs} F{s.fats}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onChoose(s);
                      onOpenChange(false);
                    }}
                  >
                    Scegli
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
