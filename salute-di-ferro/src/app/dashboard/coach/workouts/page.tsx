"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Dumbbell, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Difficulty,
  WorkoutType,
  WorkoutTemplateSummary,
} from "@/lib/mock-workouts";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzato",
  EXPERT: "Expert",
};

const TYPE_LABEL: Record<WorkoutType, string> = {
  STRENGTH: "Forza",
  HYPERTROPHY: "Ipertrofia",
  POWERLIFTING: "Powerlifting",
  CONDITIONING: "Condizionamento",
  CUSTOM: "Custom",
};

export default function WorkoutsListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<"ALL" | WorkoutType>("ALL");
  const [difficulty, setDifficulty] = React.useState<"ALL" | Difficulty>("ALL");

  const params = new URLSearchParams({ q, type, difficulty });
  const { data = [], isLoading } = useQuery<WorkoutTemplateSummary[]>({
    queryKey: ["workouts", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/workouts?${params}`);
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workouts", { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (t: WorkoutTemplateSummary) => {
      router.push(`/dashboard/coach/workouts/${t.id}/edit`);
    },
  });

  const dupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workouts/${id}`, { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (t: WorkoutTemplateSummary) => {
      toast.success("Scheda duplicata");
      qc.invalidateQueries({ queryKey: ["workouts"] });
      router.push(`/dashboard/coach/workouts/${t.id}/edit`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Schede di allenamento
          </h1>
          <p className="text-muted-foreground text-sm">
            Crea e gestisci i template delle tue schede
          </p>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Crea Nuova Scheda
        </button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca scheda..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as "ALL" | WorkoutType)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti i tipi</SelectItem>
              {Object.entries(TYPE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as "ALL" | Difficulty)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutte le difficoltà</SelectItem>
              {Object.entries(DIFFICULTY_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : data.length === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center">
          Nessuna scheda trovata
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <Card
              key={t.id}
              className="hover:border-primary/40 flex flex-col transition-colors"
            >
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{t.name}</h3>
                    <p className="text-muted-foreground truncate text-xs">
                      {t.description ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-primary/10 text-primary">
                    {TYPE_LABEL[t.type]}
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground">
                    {DIFFICULTY_LABEL[t.difficulty]}
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground">
                    {t.dayCount} giorni
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-auto flex items-center justify-between text-xs">
                  <span>
                    Creata il{" "}
                    {new Date(t.createdAt).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/coach/workouts/${t.id}/edit`}
                    className="bg-primary/10 text-primary hover:bg-primary/20 flex h-9 flex-1 items-center justify-center rounded-md text-sm font-medium"
                  >
                    Modifica
                  </Link>
                  <button
                    type="button"
                    onClick={() => dupMutation.mutate(t.id)}
                    disabled={dupMutation.isPending}
                    title="Duplica"
                    className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md border"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
