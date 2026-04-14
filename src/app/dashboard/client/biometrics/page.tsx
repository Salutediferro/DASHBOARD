"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Loader2, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BiometricEntry } from "@/lib/mock-biometrics";

const ENERGY_EMOJI = ["😫", "😫", "😩", "😐", "😐", "😊", "😊", "💪", "🔥", "🔥"];

type FormState = Partial<BiometricEntry>;

function num(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(s: string): string | null {
  return s === "" ? null : s;
}

function computeBmi(heightCm: number | null | undefined, weightKg: number | null | undefined) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

function bmiLabel(bmi: number | null): { label: string; tone: string } {
  if (bmi == null) return { label: "—", tone: "text-muted-foreground" };
  if (bmi < 18.5) return { label: "sottopeso", tone: "text-blue-600" };
  if (bmi < 25) return { label: "normopeso", tone: "text-green-600" };
  if (bmi < 30) return { label: "sovrappeso", tone: "text-amber-600" };
  return { label: "obesità", tone: "text-red-600" };
}

function Section({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col">
            <span className="font-heading text-lg font-semibold">{title}</span>
            {subtitle && (
              <span className="text-muted-foreground text-xs">{subtitle}</span>
            )}
          </div>
          <ChevronDown className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <CardContent className="flex flex-col gap-4 px-5 pt-0 pb-5">
          {children}
        </CardContent>
      </details>
    </Card>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
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

  const [form, setForm] = React.useState<FormState>({
    energyLevel: 7,
    sleepQuality: 7,
  });

  React.useEffect(() => {
    if (existing) {
      setForm({ ...existing });
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
  const bmi = computeBmi(form.heightCm, form.weightKg);
  const bmiMeta = bmiLabel(bmi);

  return (
    <div className="flex flex-col gap-4 pb-28">
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

      {/* 1 — Composizione corporea */}
      <Section
        title="Composizione corporea"
        subtitle="Peso, massa grassa/muscolare, BMI"
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-3">
          <Field id="height" label="Altezza (cm)">
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.heightCm ?? ""}
              onChange={(e) => set("heightCm", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="178"
            />
          </Field>
          <Field id="weight" label="Peso (kg)">
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.weightKg ?? ""}
              onChange={(e) => set("weightKg", num(e.target.value))}
              className="h-11 text-lg tabular-nums"
              placeholder="79.5"
            />
          </Field>
          <Field id="bf" label="Massa grassa (%)">
            <Input
              id="bf"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.bodyFatPercentage ?? ""}
              onChange={(e) =>
                set("bodyFatPercentage", num(e.target.value))
              }
              className="h-11 tabular-nums"
              placeholder="18.0"
            />
          </Field>
          <Field id="mm" label="Massa muscolare (kg)">
            <Input
              id="mm"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.muscleMassKg ?? ""}
              onChange={(e) => set("muscleMassKg", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="38.0"
            />
          </Field>
          <Field id="water" label="Acqua corporea (%)">
            <Input
              id="water"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.bodyWaterPct ?? ""}
              onChange={(e) => set("bodyWaterPct", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="58.0"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label>BMI</Label>
            <div className="bg-muted/40 flex h-11 items-center justify-between rounded-md border px-3">
              <span className="font-heading text-lg tabular-nums">
                {bmi ?? "—"}
              </span>
              <span className={cn("text-xs font-semibold", bmiMeta.tone)}>
                {bmiMeta.label}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* 2 — Circonferenze */}
      <Section
        title="Circonferenze"
        subtitle="Misure antropometriche (cm)"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field id="waist" label="Vita">
            <Input
              id="waist"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.waistCm ?? ""}
              onChange={(e) => set("waistCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="hips" label="Fianchi">
            <Input
              id="hips"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.hipsCm ?? ""}
              onChange={(e) => set("hipsCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="chest-cm" label="Petto">
            <Input
              id="chest-cm"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.chestCm ?? ""}
              onChange={(e) => set("chestCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="arms" label="Braccia">
            <Input
              id="arms"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.armsCm ?? ""}
              onChange={(e) => set("armsCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="thigh" label="Coscia">
            <Input
              id="thigh"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.thighCm ?? ""}
              onChange={(e) => set("thighCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="calves" label="Polpacci">
            <Input
              id="calves"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={form.calvesCm ?? ""}
              onChange={(e) => set("calvesCm", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
        </div>
      </Section>

      {/* 3 — Cardiovascolare */}
      <Section
        title="Cardiovascolare"
        subtitle="Pressione, frequenza, SpO₂, HRV"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field id="sys" label="Pressione sist. (mmHg)">
            <Input
              id="sys"
              type="number"
              inputMode="numeric"
              value={form.systolicBP ?? ""}
              onChange={(e) => set("systolicBP", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="120"
            />
          </Field>
          <Field id="dia" label="Pressione diast. (mmHg)">
            <Input
              id="dia"
              type="number"
              inputMode="numeric"
              value={form.diastolicBP ?? ""}
              onChange={(e) => set("diastolicBP", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="80"
            />
          </Field>
          <Field id="hr" label="FC a riposo (bpm)">
            <Input
              id="hr"
              type="number"
              inputMode="numeric"
              value={form.restingHR ?? ""}
              onChange={(e) => set("restingHR", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="spo2" label="SpO₂ (%)">
            <Input
              id="spo2"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.spo2 ?? ""}
              onChange={(e) => set("spo2", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="98"
            />
          </Field>
          <Field id="hrv" label="HRV (ms)">
            <Input
              id="hrv"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.hrv ?? ""}
              onChange={(e) => set("hrv", num(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
        </div>
      </Section>

      {/* 4 — Metabolica */}
      <Section title="Metabolica" subtitle="Glicemia, chetoni, temperatura">
        <div className="grid grid-cols-2 gap-3">
          <Field id="glc-fast" label="Glicemia digiuno (mg/dL)">
            <Input
              id="glc-fast"
              type="number"
              inputMode="numeric"
              value={form.glucoseFasting ?? ""}
              onChange={(e) => set("glucoseFasting", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="90"
            />
          </Field>
          <Field id="glc-post" label="Glicemia post-pasto 2h">
            <Input
              id="glc-post"
              type="number"
              inputMode="numeric"
              value={form.glucosePostMeal ?? ""}
              onChange={(e) => set("glucosePostMeal", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="120"
            />
          </Field>
          <Field id="ket" label="Chetoni (mmol/L)">
            <Input
              id="ket"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.ketones ?? ""}
              onChange={(e) => set("ketones", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="0.5"
            />
          </Field>
          <Field id="temp" label="Temperatura (°C)">
            <Input
              id="temp"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.bodyTempC ?? ""}
              onChange={(e) => set("bodyTempC", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="36.5"
            />
          </Field>
        </div>
      </Section>

      {/* 5 — Sonno */}
      <Section title="Sonno" subtitle="Durata, qualità, orari, risvegli">
        <div className="grid grid-cols-2 gap-3">
          <Field id="sleep-hours" label="Ore di sonno">
            <Input
              id="sleep-hours"
              type="number"
              inputMode="decimal"
              step="0.25"
              value={form.sleepHours ?? ""}
              onChange={(e) => set("sleepHours", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="7.5"
            />
          </Field>
          <Field id="awakenings" label="Risvegli notturni">
            <Input
              id="awakenings"
              type="number"
              inputMode="numeric"
              value={form.sleepAwakenings ?? ""}
              onChange={(e) => set("sleepAwakenings", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="0"
            />
          </Field>
          <Field id="bedtime" label="Addormentamento">
            <Input
              id="bedtime"
              type="time"
              value={form.sleepBedtime ?? ""}
              onChange={(e) => set("sleepBedtime", str(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
          <Field id="wake" label="Risveglio">
            <Input
              id="wake"
              type="time"
              value={form.sleepWakeTime ?? ""}
              onChange={(e) => set("sleepWakeTime", str(e.target.value))}
              className="h-11 tabular-nums"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <Label>Qualità del sonno</Label>
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
      </Section>

      {/* 6 — Attività */}
      <Section title="Attività" subtitle="Passi, calorie, minuti attivi">
        <div className="grid grid-cols-2 gap-3">
          <Field id="steps" label="Passi">
            <Input
              id="steps"
              type="number"
              inputMode="numeric"
              value={form.steps ?? ""}
              onChange={(e) => set("steps", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="8000"
            />
          </Field>
          <Field id="kcal" label="Calorie bruciate">
            <Input
              id="kcal"
              type="number"
              inputMode="numeric"
              value={form.caloriesBurned ?? ""}
              onChange={(e) => set("caloriesBurned", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="450"
            />
          </Field>
          <Field id="active-min" label="Minuti attivi">
            <Input
              id="active-min"
              type="number"
              inputMode="numeric"
              value={form.activeMinutes ?? ""}
              onChange={(e) => set("activeMinutes", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="45"
            />
          </Field>
          <Field id="dist" label="Distanza (km)">
            <Input
              id="dist"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.distanceKm ?? ""}
              onChange={(e) => set("distanceKm", num(e.target.value))}
              className="h-11 tabular-nums"
              placeholder="5.0"
            />
          </Field>
        </div>
      </Section>

      {/* Energia + note (sempre visibili) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
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

          <Field id="notes" label="Note">
            <Textarea
              id="notes"
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Come ti senti? Qualcosa da annotare?"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Save button — sticky in fondo */}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t p-4 backdrop-blur md:sticky md:inset-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 flex h-14 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold disabled:opacity-50",
            )}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
