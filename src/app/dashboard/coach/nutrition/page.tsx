"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Apple, Plus, ShoppingCart, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NutritionPlanSummary } from "@/lib/mock-nutrition";

export default function NutritionListPage() {
  const router = useRouter();
  const { data = [], isLoading } = useQuery<NutritionPlanSummary[]>({
    queryKey: ["nutrition-plans"],
    queryFn: async () => {
      const res = await fetch("/api/nutrition/plans");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/nutrition/plans", { method: "POST" });
      return res.json();
    },
    onSuccess: (p: { id: string }) => {
      router.push(`/dashboard/coach/nutrition/${p.id}/edit`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Nutrizione
          </h1>
          <p className="text-muted-foreground text-sm">
            Crea e gestisci i piani alimentari
          </p>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nuovo piano
        </button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">Nessun piano ancora.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
                    <Apple className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{p.name}</h3>
                    {p.clientName && (
                      <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                        <User className="h-3 w-3" />
                        {p.clientName}
                      </p>
                    )}
                  </div>
                  {p.isActive && (
                    <Badge className="bg-green-500/20 text-green-400">Attivo</Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-muted-foreground text-[10px]">Kcal</p>
                    <p className="text-sm font-semibold">{p.targetCalories}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">P</p>
                    <p className="text-sm font-semibold">{p.targetProtein}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">C</p>
                    <p className="text-sm font-semibold">{p.targetCarbs}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">F</p>
                    <p className="text-sm font-semibold">{p.targetFats}g</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/coach/nutrition/${p.id}/edit`}
                    className="bg-primary/10 text-primary hover:bg-primary/20 flex h-9 flex-1 items-center justify-center rounded-md text-sm font-medium"
                  >
                    Modifica
                  </Link>
                  <Link
                    href={`/dashboard/coach/nutrition/${p.id}/shopping-list`}
                    className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md border"
                    title="Lista spesa"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
