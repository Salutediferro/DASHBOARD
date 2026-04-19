"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Scale } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function QuickWeightCard({ lastWeight }: { lastWeight: number | null }) {
  const qc = useQueryClient();
  const [value, setValue] = React.useState("");

  const mutation = useMutation({
    mutationFn: async (weightKg: number) => {
      const res = await fetch("/api/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: { weight: weightKg } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore durante il salvataggio");
      }
      return res.json();
    },
    // Optimistically push the new reading into the dashboard cache so the
    // chart, goal progress and "ultima registrazione" update instantly.
    onMutate: async (weightKg) => {
      const key = ["biometrics", { scope: "patient-dashboard" }] as const;
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ items: unknown[] }>(key);
      const optimistic = {
        id: `tmp-${Date.now()}`,
        date: new Date().toISOString(),
        weight: weightKg,
        bmi: null,
        bodyFatPercentage: null,
        waistCm: null,
      };
      qc.setQueryData<{ items: unknown[] }>(key, (old) => ({
        items: [optimistic, ...(old?.items ?? [])],
      }));
      setValue("");
      return { prev, key };
    },
    onSuccess: () => {
      toast.success("Peso registrato");
      qc.invalidateQueries({ queryKey: ["biometrics"] });
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
      toast.error(e.message);
    },
  });

  function submit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 30 || n > 250) {
      toast.error("Inserisci un peso valido (30-250 kg)");
      return;
    }
    mutation.mutate(Number(n.toFixed(1)));
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-5">
        <div className="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-md">
          <Scale className="h-6 w-6" />
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
          <Label htmlFor="quick-weight" className="text-xs font-semibold uppercase">
            Peso di oggi
          </Label>
          <Input
            id="quick-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={lastWeight != null ? lastWeight.toFixed(1) : "79.5"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="h-11 text-lg tabular-nums"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={mutation.isPending || !value}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Registra
        </button>
      </CardContent>
    </Card>
  );
}
