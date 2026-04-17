"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/health/metric-card";
import { MetricChart } from "@/components/health/metric-chart";
import { MetricForm, type MetricField } from "@/components/health/metric-form";
import {
  useBiometricSummary,
  useBiometrics,
  type BiometricLogDTO,
  type BiometricSummaryResponse,
} from "@/lib/hooks/use-biometrics";

type Props = {
  /** Omit for patient self-view; required for professional readonly views. */
  patientId?: string;
  readOnly?: boolean;
};

const CATEGORIES = [
  { key: "body", label: "Corporei" },
  { key: "circumferences", label: "Circonferenze" },
  { key: "cardiovascular", label: "Cardiovascolare" },
  { key: "metabolic", label: "Metabolica" },
  { key: "sleep", label: "Sonno" },
  { key: "activity", label: "Attività" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

// ── per-category field config ─────────────────────────────────────────────
const FIELDS: Record<CategoryKey, MetricField[]> = {
  body: [
    { name: "weight", label: "Peso", unit: "kg", step: "0.1", placeholder: "75.0" },
    { name: "bodyFatPercentage", label: "% grasso", unit: "%", step: "0.1" },
    { name: "muscleMassKg", label: "Massa muscolare", unit: "kg", step: "0.1" },
    { name: "bodyWaterPct", label: "Acqua corporea", unit: "%", step: "0.1" },
  ],
  circumferences: [
    { name: "waistCm", label: "Vita", unit: "cm", step: "0.5" },
    { name: "hipsCm", label: "Fianchi", unit: "cm", step: "0.5" },
    { name: "chestCm", label: "Petto", unit: "cm", step: "0.5" },
    { name: "armsCm", label: "Braccia", unit: "cm", step: "0.5" },
    { name: "thighCm", label: "Coscia", unit: "cm", step: "0.5" },
    { name: "calvesCm", label: "Polpaccio", unit: "cm", step: "0.5" },
  ],
  cardiovascular: [
    { name: "systolicBP", label: "PA sistolica", unit: "mmHg", step: "1" },
    { name: "diastolicBP", label: "PA diastolica", unit: "mmHg", step: "1" },
    { name: "restingHR", label: "FC riposo", unit: "bpm", step: "1" },
    { name: "spo2", label: "SpO2", unit: "%", step: "0.1" },
    { name: "hrv", label: "HRV", unit: "ms", step: "1" },
  ],
  metabolic: [
    {
      name: "glucoseFasting",
      label: "Glicemia digiuno",
      unit: "mg/dL",
      step: "1",
    },
    {
      name: "glucosePostMeal",
      label: "Glicemia post-pasto",
      unit: "mg/dL",
      step: "1",
    },
    { name: "ketones", label: "Chetoni", unit: "mmol/L", step: "0.1" },
    {
      name: "bodyTempC",
      label: "Temperatura corporea",
      unit: "°C",
      step: "0.1",
    },
  ],
  sleep: [
    { name: "sleepHours", label: "Ore dormite", unit: "h", step: "0.25" },
    { name: "sleepQuality", label: "Qualità (1-10)", step: "1" },
    {
      name: "sleepBedtime",
      label: "A letto",
      type: "time",
      placeholder: "23:30",
    },
    {
      name: "sleepWakeTime",
      label: "Sveglia",
      type: "time",
      placeholder: "07:00",
    },
    { name: "sleepAwakenings", label: "Risvegli", step: "1" },
  ],
  activity: [
    { name: "steps", label: "Passi", step: "1" },
    { name: "caloriesBurned", label: "Kcal bruciate", step: "1" },
    { name: "activeMinutes", label: "Minuti attivi", unit: "min", step: "1" },
    { name: "distanceKm", label: "Distanza", unit: "km", step: "0.1" },
  ],
};

// Primary numeric metrics per category, used to build the KPI cards and charts.
const PRIMARY: Record<
  CategoryKey,
  Array<{ key: keyof BiometricLogDTO; label: string; unit?: string; invert?: boolean; decimals?: number }>
> = {
  body: [
    { key: "weight", label: "Peso", unit: "kg", invert: true, decimals: 1 },
    { key: "bmi", label: "BMI", invert: true, decimals: 1 },
    { key: "bodyFatPercentage", label: "% grasso", unit: "%", invert: true, decimals: 1 },
    { key: "muscleMassKg", label: "Massa muscolare", unit: "kg", decimals: 1 },
  ],
  circumferences: [
    { key: "waistCm", label: "Vita", unit: "cm", invert: true },
    { key: "hipsCm", label: "Fianchi", unit: "cm", invert: true },
    { key: "chestCm", label: "Petto", unit: "cm" },
    { key: "armsCm", label: "Braccia", unit: "cm" },
  ],
  cardiovascular: [
    { key: "systolicBP", label: "PA sistolica", unit: "mmHg", invert: true, decimals: 0 },
    { key: "diastolicBP", label: "PA diastolica", unit: "mmHg", invert: true, decimals: 0 },
    { key: "restingHR", label: "FC riposo", unit: "bpm", invert: true, decimals: 0 },
    { key: "spo2", label: "SpO2", unit: "%" },
  ],
  metabolic: [
    { key: "glucoseFasting", label: "Glicemia digiuno", unit: "mg/dL", invert: true, decimals: 0 },
    { key: "glucosePostMeal", label: "Glicemia post-pasto", unit: "mg/dL", invert: true, decimals: 0 },
    { key: "ketones", label: "Chetoni", unit: "mmol/L" },
    { key: "bodyTempC", label: "Temperatura", unit: "°C" },
  ],
  sleep: [
    { key: "sleepHours", label: "Ore dormite", unit: "h" },
    { key: "sleepQuality", label: "Qualità", decimals: 0 },
  ],
  activity: [
    { key: "steps", label: "Passi", decimals: 0 },
    { key: "caloriesBurned", label: "Kcal", decimals: 0 },
    { key: "activeMinutes", label: "Minuti attivi", unit: "min", decimals: 0 },
    { key: "distanceKm", label: "Distanza", unit: "km" },
  ],
};

// ── helpers ───────────────────────────────────────────────────────────────
function latestAndPrevious(
  items: BiometricLogDTO[],
  key: keyof BiometricLogDTO,
): { current: number | null; previous: number | null } {
  // items come in DESC order from /api/biometrics
  const vals: number[] = [];
  for (const r of items) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) vals.push(v);
    if (vals.length === 2) break;
  }
  return { current: vals[0] ?? null, previous: vals[1] ?? null };
}

function seriesFor(
  summary: BiometricSummaryResponse | undefined,
  key: keyof BiometricSummaryResponse["series"][number],
): Array<{ date: string; value: number | null }> {
  if (!summary) return [];
  return summary.series.map((p) => ({
    date: p.date,
    value: (p[key] as number | null) ?? null,
  }));
}

function formatCsvValue(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(items: BiometricLogDTO[]) {
  if (items.length === 0) return;
  const headers: (keyof BiometricLogDTO)[] = [
    "date",
    "weight",
    "bmi",
    "bodyFatPercentage",
    "muscleMassKg",
    "bodyWaterPct",
    "waistCm",
    "hipsCm",
    "chestCm",
    "armsCm",
    "thighCm",
    "calvesCm",
    "systolicBP",
    "diastolicBP",
    "restingHR",
    "spo2",
    "hrv",
    "glucoseFasting",
    "glucosePostMeal",
    "ketones",
    "bodyTempC",
    "sleepHours",
    "sleepQuality",
    "sleepAwakenings",
    "steps",
    "caloriesBurned",
    "activeMinutes",
    "distanceKm",
    "energyLevel",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const r of items) {
    lines.push(headers.map((h) => formatCsvValue(r[h])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biometrics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── component ─────────────────────────────────────────────────────────────
export function HealthTabs({ patientId, readOnly }: Props) {
  const [days, setDays] = React.useState<30 | 90 | 365>(30);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const listParams = React.useMemo(
    () => ({
      patientId,
      from: from || undefined,
      to: to || undefined,
      perPage: 200,
    }),
    [patientId, from, to],
  );
  const list = useBiometrics(listParams);
  const summary = useBiometricSummary(days, patientId);

  const items = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      {readOnly && (
        <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">Dal</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">Al</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadCsv(items)}
              disabled={items.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Esporta CSV
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Finestra trend:</span>
        {[30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d as 30 | 90 | 365)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {d} giorni
          </button>
        ))}
      </div>

      <Tabs defaultValue="body">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent
            key={c.key}
            value={c.key}
            className="mt-4 flex flex-col gap-4"
          >
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {PRIMARY[c.key].map((m) => {
                const { current, previous } = latestAndPrevious(
                  items,
                  m.key,
                );
                return (
                  <MetricCard
                    key={String(m.key)}
                    label={m.label}
                    value={current}
                    previous={previous}
                    unit={m.unit}
                    invertTrend={m.invert}
                    decimals={m.decimals ?? 1}
                  />
                );
              })}
            </div>

            {/* Entry form — patient only */}
            {!readOnly && (
              <MetricForm category={c.key} fields={FIELDS[c.key]} />
            )}

            {/* Charts for primary metrics */}
            <div className="grid gap-3 md:grid-cols-2">
              {PRIMARY[c.key]
                .filter((m) =>
                  [
                    "weight",
                    "bmi",
                    "bodyFatPercentage",
                    "muscleMassKg",
                    "waistCm",
                    "systolicBP",
                    "diastolicBP",
                    "restingHR",
                    "spo2",
                    "glucoseFasting",
                    "sleepHours",
                    "steps",
                  ].includes(String(m.key)),
                )
                .map((m) => (
                  <MetricChart
                    key={String(m.key)}
                    title={m.label}
                    unit={m.unit}
                    data={seriesFor(
                      summary.data,
                      m.key as keyof BiometricSummaryResponse["series"][number],
                    )}
                  />
                ))}
            </div>

            {/* Historic list (last 10 rows) */}
            {items.length > 0 && (
              <div className="border-border rounded-lg border">
                <div className="bg-muted/30 border-b border-border px-4 py-2 text-xs font-semibold uppercase">
                  Ultime {Math.min(10, items.length)} misurazioni
                </div>
                <ul className="divide-border divide-y">
                  {items.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {new Date(r.date).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="tabular-nums">
                        {summaryRowLabel(c.key, r)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function summaryRowLabel(category: CategoryKey, r: BiometricLogDTO): string {
  const parts: string[] = [];
  switch (category) {
    case "body":
      if (r.weight != null) parts.push(`${r.weight.toFixed(1)} kg`);
      if (r.bmi != null) parts.push(`BMI ${r.bmi.toFixed(1)}`);
      break;
    case "circumferences":
      if (r.waistCm != null) parts.push(`vita ${r.waistCm}`);
      if (r.hipsCm != null) parts.push(`fianchi ${r.hipsCm}`);
      break;
    case "cardiovascular":
      if (r.systolicBP != null && r.diastolicBP != null)
        parts.push(`${r.systolicBP}/${r.diastolicBP}`);
      if (r.restingHR != null) parts.push(`${r.restingHR} bpm`);
      break;
    case "metabolic":
      if (r.glucoseFasting != null) parts.push(`${r.glucoseFasting} mg/dL`);
      break;
    case "sleep":
      if (r.sleepHours != null) parts.push(`${r.sleepHours.toFixed(1)} h`);
      if (r.sleepQuality != null) parts.push(`q ${r.sleepQuality}/10`);
      break;
    case "activity":
      if (r.steps != null) parts.push(`${r.steps} passi`);
      if (r.distanceKm != null) parts.push(`${r.distanceKm.toFixed(1)} km`);
      break;
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}
