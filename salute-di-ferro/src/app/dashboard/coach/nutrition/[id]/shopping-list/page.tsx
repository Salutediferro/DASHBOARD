"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ShoppingListGroup = {
  category: string;
  items: { foodId: string; name: string; totalGrams: number }[];
};

export default function ShoppingListPage() {
  const { id } = useParams<{ id: string }>();
  const { data = [], isLoading } = useQuery<ShoppingListGroup[]>({
    queryKey: ["shopping-list", id],
    queryFn: async () => {
      const res = await fetch(`/api/nutrition/shopping-list/${id}?weeks=1`);
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
    const text = data
      .map(
        (g) =>
          `${g.category}\n` +
          g.items.map((i) => `- ${i.name}: ${i.totalGrams}g`).join("\n"),
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti");
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dashboard/coach/nutrition/${id}/edit`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Torna al piano
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Lista della spesa
          </h1>
          <p className="text-muted-foreground text-sm">
            Quantità settimanali totali
          </p>
        </div>
        <button
          type="button"
          onClick={copyToClipboard}
          className="hover:bg-muted inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium"
        >
          <Copy className="h-4 w-4" />
          Copia testo
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.map((group) => (
          <Card key={group.category}>
            <CardContent className="flex flex-col gap-2 p-5">
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {group.category.replace("_", " ")}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.foodId}
                    className="flex items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(item.foodId)}
                      onChange={() => toggle(item.foodId)}
                      className="accent-primary h-4 w-4"
                    />
                    <span
                      className={
                        checked.has(item.foodId)
                          ? "text-muted-foreground flex-1 line-through"
                          : "flex-1"
                      }
                    >
                      {item.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {item.totalGrams}g
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
