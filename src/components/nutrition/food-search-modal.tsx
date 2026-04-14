"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodCategory, FoodItem } from "@/lib/data/foods";

const CATEGORIES: (FoodCategory | "ALL")[] = [
  "ALL",
  "CARNI",
  "PESCE",
  "UOVA",
  "LATTICINI",
  "CEREALI",
  "LEGUMI",
  "VERDURE",
  "FRUTTA",
  "FRUTTA_SECCA",
  "OLI_GRASSI",
  "INTEGRATORI",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (food: FoodItem, quantityG: number) => void;
};

export function FoodSearchModal({ open, onOpenChange, onPick }: Props) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<FoodCategory | "ALL">("ALL");
  const [qty, setQty] = React.useState(100);

  const params = new URLSearchParams({ search: q, category: cat });
  const { data = [] } = useQuery<FoodItem[]>({
    queryKey: ["foods", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/foods?${params}`);
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aggiungi alimento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Nome alimento..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cat} onValueChange={(v) => setCat(v as FoodCategory | "ALL")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "ALL" ? "Tutte" : c.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground text-xs">Qtà (g)</label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <ul className="divide-border flex flex-col divide-y">
            {data.map((food) => {
              const k = qty / 100;
              const kcal = Math.round(food.caloriesPer100g * k);
              const p = Math.round(food.proteinPer100g * k * 10) / 10;
              const c = Math.round(food.carbsPer100g * k * 10) / 10;
              const fat = Math.round(food.fatsPer100g * k * 10) / 10;
              return (
                <li key={food.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {food.category.replace("_", " ")} · {kcal} kcal · P{p} C{c} F{fat}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(food, qty)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 text-xs font-medium"
                  >
                    Aggiungi
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
