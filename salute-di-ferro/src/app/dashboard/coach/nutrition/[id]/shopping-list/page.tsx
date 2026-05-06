"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
} from "@/lib/validators/nutrition";
import { readApiError } from "@/lib/api-error";

type ShoppingListGroup = {
  category: string;
  items: {
    foodId: string;
    name: string;
    totalGrams: number;
    other: { unit: string; quantity: number }[];
  }[];
};

type Response = {
  groups: ShoppingListGroup[];
  weeks: number;
  plan: { id: string; name: string };
};

export default function ShoppingListPage() {
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const { data, isLoading } = useQuery({
    queryKey: ["nutrition", "shopping-list", planId, 1] as const,
    enabled: !!planId,
    queryFn: async (): Promise<Response> => {
      const res = await fetch(
        `/api/nutrition/shopping-list/${planId}?weeks=1`,
      );
      if (!res.ok) throw new Error(await readApiError(res, "Errore"));
      return res.json();
    },
  });

  const [checked, setChecked] = React.useState<Set<string>>(new Set());

  function toggle(foodId: string) {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(foodId)) n.delete(foodId);
      else n.add(foodId);
      return n;
    });
  }

  function copyToClipboard() {
    if (!data) return;
    const text = data.groups
      .map((g) => {
        const label =
          FOOD_CATEGORY_LABELS[g.category as FoodCategory] ?? g.category;
        const lines = g.items.map((i) => {
          const grams = i.totalGrams > 0 ? `${i.totalGrams}g` : "";
          const other = i.other
            .map((o) => `${Math.round(o.quantity)} ${o.unit.toLowerCase()}`)
            .join(", ");
          const qty = [grams, other].filter(Boolean).join(" + ");
          return `- ${i.name}${qty ? `: ${qty}` : ""}`;
        });
        return `${label}\n${lines.join("\n")}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti");
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isEmpty = data.groups.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dashboard/coach/nutrition/${planId}/edit`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Torna al piano
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-2xl md:text-3xl">
            Lista della spesa
          </h1>
          <p className="text-muted-foreground text-sm">
            Quantità settimanali totali · {data.plan.name}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={copyToClipboard}
          disabled={isEmpty}
        >
          <Copy className="h-4 w-4" />
          Copia testo
        </Button>
      </header>

      {isEmpty ? (
        <p className="text-muted-foreground text-sm">
          Il piano non contiene ancora alimenti.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.groups.map((group) => {
            const label =
              FOOD_CATEGORY_LABELS[group.category as FoodCategory] ??
              group.category;
            return (
              <Card key={group.category}>
                <CardContent className="flex flex-col gap-2 p-5">
                  <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    {label}
                  </h2>
                  <ul className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const grams =
                        item.totalGrams > 0 ? `${item.totalGrams}g` : "";
                      const other = item.other
                        .map(
                          (o) =>
                            `${Math.round(o.quantity)} ${o.unit.toLowerCase()}`,
                        )
                        .join(", ");
                      const qty = [grams, other].filter(Boolean).join(" + ");
                      const isChecked = checked.has(item.foodId);
                      return (
                        <li
                          key={item.foodId}
                          className="flex items-center gap-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(item.foodId)}
                            className="accent-primary-500 h-4 w-4"
                          />
                          <span
                            className={
                              isChecked
                                ? "text-muted-foreground flex-1 line-through"
                                : "flex-1"
                            }
                          >
                            {item.name}
                          </span>
                          <span className="text-muted-foreground font-mono text-xs tabular-nums">
                            {qty || "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
