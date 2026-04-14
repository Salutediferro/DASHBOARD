"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Minus,
  Pencil,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Suggestion = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "IGNORED";
  action: "INCREASE_WEIGHT" | "MAINTAIN" | "REDUCE_WEIGHT" | "ADD_SET" | "DELOAD";
  reason: string;
  lastWeight: number | null;
  lastReps: number | null;
  lastRpe: number | null;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  suggestedSets: number | null;
  exercise: { id: string; nameIt: string; name: string; muscleGroup: string };
};

type OneRmRow = { slug: string; history: Array<{ date: string; e1rm: number }> };

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}

const ACTION_META = {
  INCREASE_WEIGHT: { icon: TrendingUp, color: "text-emerald-600", label: "Aumenta" },
  MAINTAIN: { icon: Minus, color: "text-muted-foreground", label: "Mantieni" },
  REDUCE_WEIGHT: { icon: TrendingDown, color: "text-rose-600", label: "Riduci" },
  ADD_SET: { icon: TrendingUp, color: "text-amber-600", label: "+1 Set" },
  DELOAD: { icon: TrendingDown, color: "text-sky-600", label: "Deload" },
} as const;

export function ProgressionSuggestions({ clientId }: { clientId: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["progression", clientId],
    queryFn: async (): Promise<{ suggestions: Suggestion[]; oneRm: OneRmRow[] }> => {
      const res = await fetch(
        `/api/coach/clients/${clientId}/progression`,
        { headers: devHeaders() },
      );
      if (!res.ok) return { suggestions: [], oneRm: [] };
      return res.json();
    },
  });

  const regen = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/coach/clients/${clientId}/progression`, {
        method: "POST",
        headers: devHeaders(),
      });
      if (!res.ok) throw new Error("Generazione fallita");
      return res.json();
    },
    onSuccess: (d) => {
      toast.success(`${d.count} suggerimenti generati`);
      qc.invalidateQueries({ queryKey: ["progression", clientId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const suggestions = query.data?.suggestions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Suggerimenti Progressione</h3>
          <p className="text-muted-foreground text-xs">
            Basati sullo storico delle ultime 6 settimane
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
          className="gap-2"
        >
          {regen.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Rigenera
        </Button>
      </div>

      {query.isLoading ? (
        <Card>
          <CardContent className="flex h-24 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
            Nessun suggerimento disponibile.
            <span className="text-xs">
              Clicca "Rigenera" per calcolarli dallo storico allenamenti.
            </span>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} clientId={clientId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  clientId,
}: {
  suggestion: Suggestion;
  clientId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [weight, setWeight] = React.useState(suggestion.suggestedWeight ?? 0);
  const [reps, setReps] = React.useState(suggestion.suggestedReps ?? 0);

  const mutate = useMutation({
    mutationFn: async (payload: {
      status?: "ACCEPTED" | "IGNORED";
      suggestedWeight?: number;
      suggestedReps?: number;
    }) => {
      const res = await fetch(
        `/api/coach/progression-suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...devHeaders() },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progression", clientId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const meta = ACTION_META[suggestion.action];
  const Icon = meta.icon;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{suggestion.exercise.nameIt}</p>
            <p className="text-muted-foreground text-xs">{suggestion.reason}</p>
          </div>
          <span className={cn("flex items-center gap-1 text-xs font-medium", meta.color)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
        </div>

        <div className="bg-muted/40 flex items-center gap-3 rounded-md p-3 text-xs">
          <div className="flex-1">
            <p className="text-muted-foreground">Ultima</p>
            <p className="font-semibold tabular-nums">
              {suggestion.lastWeight}kg × {suggestion.lastReps}
              {suggestion.lastRpe && ` @ RPE ${suggestion.lastRpe}`}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground">Suggerita</p>
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="h-7 w-16 px-1 text-xs"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  className="h-7 w-12 px-1 text-xs"
                />
              </div>
            ) : (
              <p className="text-primary font-semibold tabular-nums">
                {suggestion.suggestedWeight}kg × {suggestion.suggestedReps}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={() =>
                  mutate.mutate(
                    { suggestedWeight: weight, suggestedReps: reps },
                    { onSuccess: () => setEditing(false) },
                  )
                }
                disabled={mutate.isPending}
              >
                Salva
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => mutate.mutate({ status: "ACCEPTED" })}
                disabled={mutate.isPending}
                className="gap-1"
              >
                <Check className="h-3 w-3" />
                Accetta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="gap-1"
              >
                <Pencil className="h-3 w-3" />
                Modifica
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => mutate.mutate({ status: "IGNORED" })}
                disabled={mutate.isPending}
                className="text-muted-foreground gap-1"
              >
                <X className="h-3 w-3" />
                Ignora
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
