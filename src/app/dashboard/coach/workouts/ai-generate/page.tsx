"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, RefreshCw, Save, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  AIProgram,
  AIDay,
  GenerateProgramInput,
} from "@/lib/validators/ai-program";
import {
  GOALS,
  LEVELS,
  SPLITS,
  EQUIPMENT_PROFILES,
  MUSCLE_GROUPS,
} from "@/lib/validators/ai-program";

const GOAL_LABEL: Record<(typeof GOALS)[number], string> = {
  HYPERTROPHY: "Ipertrofia",
  STRENGTH: "Forza",
  POWERLIFTING: "Powerlifting",
  FAT_LOSS: "Dimagrimento",
  RECOMP: "Ricomposizione",
  ATHLETIC: "Atletico",
};

const LEVEL_LABEL: Record<(typeof LEVELS)[number], string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzato",
  ELITE: "Elite",
};

const SPLIT_LABEL: Record<(typeof SPLITS)[number], string> = {
  FULL_BODY: "Full Body",
  UPPER_LOWER: "Upper / Lower",
  PPL: "Push Pull Legs",
  BRO_SPLIT: "Bro Split",
  AUTO: "Automatico",
};

const EQUIP_LABEL: Record<(typeof EQUIPMENT_PROFILES)[number], string> = {
  FULL_GYM: "Palestra completa",
  HOME_GYM: "Home gym",
  DUMBBELLS_ONLY: "Solo manubri",
  BODYWEIGHT: "Corpo libero",
};

const MUSCLE_LABEL: Record<(typeof MUSCLE_GROUPS)[number], string> = {
  CHEST: "Petto",
  BACK: "Schiena",
  SHOULDERS: "Spalle",
  BICEPS: "Bicipiti",
  TRICEPS: "Tricipiti",
  QUADS: "Quadricipiti",
  HAMSTRINGS: "Femorali",
  GLUTES: "Glutei",
  CALVES: "Polpacci",
  ABS: "Addome",
  FULL_BODY: "Full Body",
  CARDIO: "Cardio",
};

type ClientItem = { id: string; fullName: string };
type ClientsResponse = { items: ClientItem[]; total: number };

type FormState = {
  clientId: string | null;
  goal: (typeof GOALS)[number];
  level: (typeof LEVELS)[number];
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  split: (typeof SPLITS)[number];
  sessionDuration: 45 | 60 | 75 | 90;
  equipment: (typeof EQUIPMENT_PROFILES)[number];
  focusAreas: string[];
  injuries: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  clientId: null,
  goal: "HYPERTROPHY",
  level: "INTERMEDIATE",
  daysPerWeek: 4,
  split: "UPPER_LOWER",
  sessionDuration: 60,
  equipment: "FULL_GYM",
  focusAreas: [],
  injuries: "",
  notes: "",
};

export default function AiGenerateProgramPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [program, setProgram] = React.useState<AIProgram | null>(null);

  const clientsQuery = useQuery<ClientsResponse>({
    queryKey: ["clients", "ai-generate"],
    queryFn: async () => {
      const res = await fetch("/api/clients?perPage=100");
      if (!res.ok) throw new Error("Errore caricamento clienti");
      return res.json();
    },
  });

  const toInput = (f: FormState): GenerateProgramInput => ({
    clientId: f.clientId,
    goal: f.goal,
    level: f.level,
    daysPerWeek: f.daysPerWeek,
    split: f.split,
    sessionDuration: f.sessionDuration,
    equipment: f.equipment,
    focusAreas: f.focusAreas,
    injuries: f.injuries || undefined,
    notes: f.notes || undefined,
  });

  const generateMutation = useMutation({
    mutationFn: async (input: GenerateProgramInput) => {
      const res = await fetch("/api/ai/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Generazione fallita");
      }
      return res.json() as Promise<{ program: AIProgram; dropped: string[] }>;
    },
    onSuccess: (data) => {
      setProgram(data.program);
      toast.success("Programma generato");
      if (data.dropped?.length) {
        toast.warning(`${data.dropped.length} esercizi rimossi (id non validi)`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (opts: { redirectToEditor: boolean }) => {
      if (!program) throw new Error("Nessun programma");
      const res = await fetch("/api/workouts/from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program, goal: form.goal, level: form.level }),
      });
      if (!res.ok) throw new Error("Salvataggio fallito");
      const tpl = await res.json();
      return { tpl, redirect: opts.redirectToEditor };
    },
    onSuccess: ({ tpl, redirect }) => {
      toast.success("Template salvato");
      if (redirect) router.push(`/dashboard/coach/workouts/${tpl.id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regenDayMutation = useMutation({
    mutationFn: async (dayIndex: number) => {
      if (!program) throw new Error("Nessun programma");
      const res = await fetch("/api/ai/regenerate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toInput(form), program, dayIndex }),
      });
      if (!res.ok) throw new Error("Rigenerazione fallita");
      const data = (await res.json()) as { day: AIDay };
      return { dayIndex, day: data.day };
    },
    onSuccess: ({ dayIndex, day }) => {
      setProgram((p) =>
        p ? { ...p, days: p.days.map((d, i) => (i === dayIndex ? day : d)) } : p,
      );
      toast.success("Giorno rigenerato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFocus = (m: string) =>
    setForm((f) => ({
      ...f,
      focusAreas: f.focusAreas.includes(m)
        ? f.focusAreas.filter((x) => x !== m)
        : [...f.focusAreas, m],
    }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(toInput(form));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> Generatore AI programma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un programma settimanale personalizzato con l&apos;AI.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parametri</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Cliente (opzionale)</Label>
                <Select
                  value={form.clientId ?? "NONE"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, clientId: v === "NONE" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nessun cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nessun cliente</SelectItem>
                    {clientsQuery.data?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Obiettivo</Label>
                  <Select
                    value={form.goal}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, goal: v as FormState["goal"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOALS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GOAL_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Livello</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, level: v as FormState["level"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {LEVEL_LABEL[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Giorni / settimana</Label>
                  <Select
                    value={String(form.daysPerWeek)}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        daysPerWeek: Number(v) as FormState["daysPerWeek"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Split</Label>
                  <Select
                    value={form.split}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, split: v as FormState["split"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLITS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SPLIT_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Durata sessione (min)</Label>
                  <Select
                    value={String(form.sessionDuration)}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        sessionDuration: Number(v) as FormState["sessionDuration"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[45, 60, 75, 90].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Attrezzatura</Label>
                  <Select
                    value={form.equipment}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        equipment: v as FormState["equipment"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_PROFILES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {EQUIP_LABEL[e]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Focus muscolare</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {MUSCLE_GROUPS.map((m) => {
                    const active = form.focusAreas.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleFocus(m)}
                        className={`px-3 py-1 rounded-full border text-xs transition ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {MUSCLE_LABEL[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="injuries">Infortuni / limitazioni</Label>
                <Textarea
                  id="injuries"
                  value={form.injuries}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, injuries: e.target.value }))
                  }
                  placeholder="Es. dolore spalla sinistra, niente stacco da terra"
                />
              </div>

              <div>
                <Label htmlFor="notes">Note aggiuntive</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Es. preferisce allenarsi la mattina, grip debole"
                />
              </div>

              <Button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Generazione...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" /> GENERA PROGRAMMA
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {generateMutation.isPending && (
            <Card className="animate-pulse">
              <CardContent className="p-10 text-center space-y-4">
                <Loader2 className="size-10 mx-auto animate-spin text-primary" />
                <div className="text-lg font-medium">
                  Sto generando il tuo programma...
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary animate-[slide_1.5s_ease-in-out_infinite]" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Analisi catalogo, bilanciamento volumi, ordinamento esercizi.
                </p>
              </CardContent>
            </Card>
          )}

          {program && !generateMutation.isPending && (
            <Card>
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {program.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      saveMutation.mutate({ redirectToEditor: false })
                    }
                    disabled={saveMutation.isPending}
                  >
                    <Save className="size-4 mr-1" /> Accetta e salva come template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      saveMutation.mutate({ redirectToEditor: true })
                    }
                    disabled={saveMutation.isPending}
                  >
                    <Pencil className="size-4 mr-1" /> Modifica nell&apos;editor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateMutation.mutate(toInput(form))}
                    disabled={generateMutation.isPending}
                  >
                    <RefreshCw className="size-4 mr-1" /> Rigenera
                  </Button>
                </div>

                {program.days.map((day, di) => (
                  <div key={di} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{day.name}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => regenDayMutation.mutate(di)}
                        disabled={regenDayMutation.isPending}
                      >
                        <RefreshCw className="size-3 mr-1" /> Rigenera giorno
                      </Button>
                    </div>
                    {day.notes && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {day.notes}
                      </p>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-1">Esercizio</th>
                          <th>Set x Reps</th>
                          <th>RPE</th>
                          <th>Rest</th>
                          <th>SS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map((ex, ei) => (
                          <tr key={ei} className="border-b last:border-b-0">
                            <td className="py-1">
                              {ex.exerciseName}
                              {ex.notes && (
                                <div className="text-xs text-muted-foreground">
                                  {ex.notes}
                                </div>
                              )}
                            </td>
                            <td>
                              {ex.sets} x {ex.reps}
                            </td>
                            <td>{ex.rpe ?? "-"}</td>
                            <td>{ex.restSeconds}s</td>
                            <td>
                              {ex.supersetGroup ? (
                                <Badge variant="outline">{ex.supersetGroup}</Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!program && !generateMutation.isPending && (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center text-muted-foreground">
                Compila i parametri e premi GENERA PROGRAMMA per vedere
                l&apos;anteprima qui.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Separator className="my-8" />
    </div>
  );
}
