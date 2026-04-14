"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BiometricEntry } from "@/lib/mock-biometrics";

const ENERGY_EMOJI = ["😫", "😫", "😩", "😐", "😐", "😊", "😊", "💪", "🔥", "🔥"];

type FormState = Partial<
  Pick<
    BiometricEntry,
    | "weightKg"
    | "systolicBP"
    | "diastolicBP"
    | "bloodGlucose"
    | "restingHR"
    | "hrv"
    | "energyLevel"
    | "sleepHours"
    | "sleepQuality"
    | "steps"
    | "notes"
  >
>;

function num(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function BiometricsPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: entries = [] } = useQuery<BiometricEntry[]>({
    queryKey: ["biometrics", today, today],
    queryFn: async () => {
      const res = await fetch(`/api/biometrics?from=${today}&to=${today}`);
      return res.json();
    },
  });

  const existing = entries[0] ?? null;

  const [form, setForm] = React.useState<FormState>({});

  React.useEffect(() => {
    if (existing) {
      setForm({
        weightKg: existing.weightKg,
        systolicBP: existing.systolicBP,
        diastolicBP: existing.diastolicBP,
        bloodGlucose: existing.bloodGlucose,
        restingHR: existing.restingHR,
        hrv: existing.hrv,
        energyLevel: existing.energyLevel ?? 7,
        sleepHours: existing.sleepHours,
        sleepQuality: existing.sleepQuality ?? 7,
        steps: existing.steps,
        notes: existing.notes,
      });
    } else {
      setForm({ energyLevel: 7, sleepQuality: 7 });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: today }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dati salvati");
      qc.invalidateQueries({ queryKey: ["biometrics"] });
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const energy = form.energyLevel ?? 7;
  const sleepQ = form.sleepQuality ?? 7;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Biometriche
        </h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {existing && " · già inserito oggi"}
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.weightKg ?? ""}
              onChange={(e) => set("weightKg", num(e.target.value))}
              className="h-14 text-2xl tabular-nums"
              placeholder="79.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="systolic">Sistolica</Label>
              <Input
                id="systolic"
                type="number"
                inputMode="numeric"
                value={form.systolicBP ?? ""}
                onChange={(e) => set("systolicBP", num(e.target.value))}
                className="h-11 text-lg tabular-nums"
                placeholder="120"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diastolic">Diastolica</Label>
              <Input
                id="diastolic"
                type="number"
                inputMode="numeric"
                value={form.diastolicBP ?? ""}
                onChange={(e) => set("diastolicBP", num(e.target.value))}
                className="h-11 text-lg tabular-nums"
                placeholder="80"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="glucose">Glicemia (mg/dL)</Label>
              <Input
                id="glucose"
                type="number"
                inputMode="numeric"
                value={form.bloodGlucose ?? ""}
                onChange={(e) => set("bloodGlucose", num(e.target.value))}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hr">FC a riposo</Label>
              <Input
                id="hr"
                type="number"
                inputMode="numeric"
                value={form.restingHR ?? ""}
                onChange={(e) => set("restingHR", num(e.target.value))}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hrv">HRV (ms)</Label>
              <Input
                id="hrv"
                type="number"
                inputMode="numeric"
                value={form.hrv ?? ""}
                onChange={(e) => set("hrv", num(e.target.value))}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="steps">Passi</Label>
              <Input
                id="steps"
                type="number"
                inputMode="numeric"
                value={form.steps ?? ""}
                onChange={(e) => set("steps", num(e.target.value))}
                className="h-11 tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Energia</Label>
              <span className="font-heading text-2xl">
                {ENERGY_EMOJI[energy - 1]}{" "}
                <span className="text-primary text-lg">{energy}/10</span>
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={energy}
              onChange={(e) => set("energyLevel", Number(e.target.value))}
              className="accent-primary h-2 w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sleep-hours">Ore sonno</Label>
              <Input
                id="sleep-hours"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={form.sleepHours ?? ""}
                onChange={(e) => set("sleepHours", num(e.target.value))}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Qualità sonno</Label>
                <span className="text-primary text-sm font-semibold">
                  {sleepQ}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={sleepQ}
                onChange={(e) => set("sleepQuality", Number(e.target.value))}
                className="accent-primary h-2 w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Come ti senti? Qualcosa da annotare?"
            />
          </div>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 flex h-14 items-center justify-center gap-2 rounded-lg text-base font-semibold disabled:opacity-50",
            )}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Salva
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
