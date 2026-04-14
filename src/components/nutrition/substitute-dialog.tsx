"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Substitute = {
  id: string;
  name: string;
  category: string;
  quantityG: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type Response = {
  original: { id: string; quantityG: number };
  substitutes: Substitute[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  foodId: string | null;
  quantityG: number;
  onChoose: (s: Substitute) => void;
};

export function SubstituteDialog({
  open,
  onOpenChange,
  foodId,
  quantityG,
  onChoose,
}: Props) {
  const { data, isLoading } = useQuery<Response>({
    queryKey: ["substitute", foodId, quantityG],
    queryFn: async () => {
      const res = await fetch("/api/nutrition/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId, quantityG }),
      });
      return res.json();
    },
    enabled: open && !!foodId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sostituzioni suggerite</DialogTitle>
          <DialogDescription>
            Alternative con macro simili nella stessa categoria
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Ricerca...</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(data?.substitutes ?? []).map((s) => (
              <li
                key={s.id}
                className="border-border flex items-center gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.quantityG}g · {s.calories} kcal · P{s.protein} C{s.carbs} F{s.fats}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChoose(s);
                    onOpenChange(false);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 text-xs font-medium"
                >
                  Scegli
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
