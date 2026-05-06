"use client";

import * as React from "react";
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
import { Button } from "@/components/ui/button";
import {
  FOOD_CATEGORIES,
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
} from "@/lib/validators/nutrition";
import { useFoods, type FoodDTO } from "@/lib/hooks/use-nutrition";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (food: FoodDTO, quantityG: number) => void;
};

export function FoodSearchModal({ open, onOpenChange, onPick }: Props) {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<FoodCategory | "ALL">("ALL");
  const [qty, setQty] = React.useState(100);

  const { data, isLoading } = useFoods(
    open
      ? { search: q, category: category === "ALL" ? undefined : category }
      : {},
  );
  const foods = data?.foods ?? [];

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
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as FoodCategory | "ALL")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte le categorie</SelectItem>
              {FOOD_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {FOOD_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground text-xs">Qtà (g)</label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
              className="w-20"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Caricamento...
            </p>
          ) : foods.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nessun alimento trovato.
            </p>
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {foods.map((food) => {
                const k = qty / 100;
                const kcal = Math.round(food.caloriesPer100g * k);
                const p = Math.round(food.proteinPer100g * k * 10) / 10;
                const c = Math.round(food.carbsPer100g * k * 10) / 10;
                const fat = Math.round(food.fatsPer100g * k * 10) / 10;
                const label = food.category
                  ? (FOOD_CATEGORY_LABELS[
                      food.category as FoodCategory
                    ] ?? food.category)
                  : "Altro";
                return (
                  <li
                    key={food.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {food.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {label} · {kcal} kcal · P{p} C{c} F{fat}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onPick(food, qty)}
                    >
                      Aggiungi
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
