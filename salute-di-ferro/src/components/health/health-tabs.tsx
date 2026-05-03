"use client";

import * as React from "react";
import { Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Sex } from "@prisma/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useBiometrics,
  useDeleteBiometric,
  type BiometricLogDTO,
} from "@/lib/hooks/use-biometrics";
import {
  useHealthCategoryPrefs,
  type HealthCategoryKey,
} from "@/lib/hooks/use-health-category-prefs";

import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import { MetricChart } from "@/components/health/metric-chart";
import { MetricForm, type MetricField } from "@/components/health/metric-form";
import HealthEmptyState from "@/components/health/health-empty-state";
import { SleepScoreCard } from "@/components/health/sleep-score-card";
import { summarizeSleep } from "@/lib/health/sleep-score";
import { HealthRingRow } from "./health-ring-row";

export type PatientProfile = {
  targetWeightKg: number | null;
  heightCm: number | null;
  sex: Sex | null;
};

type Props = {
  /** Patient bio (target weight / height / sex). Optional: when omitted,
   *  rings still show current values but without a target bar. */
  profile?: PatientProfile;
  /** Omit for patient self-view; required for professional readonly views. */
  patientId?: string;
  readOnly?: boolean;
};

const EMPTY_PROFILE: PatientProfile = {
  targetWeightKg: null,
  heightCm: null,
  sex: null,
};

// ── Categories & fields ─────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "body", label: "Corporei" },
  { key: "circumferences", label: "Circonferenze" },
  { key: "cardiovascular", label: "Cardiovascolare" },
  { key: "metabolic", label: "Metabolica" },
  { key: "sleep", label: "Sonno" },
  { key: "activity", label: "Attività" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

// Min/max here MUST mirror the server-side Zod ranges in
// `src/lib/validators/biometric.ts`. Before we carried them through to
// the UI, the user could type SpO2=32 / quality=24 / BP=5, the form
// sent it, and Prisma → Zod rejected it with a generic "Errore
// salvataggio". Keeping the limits co-located with the labels lets the
// browser reject absurd values up front.
const FIELDS: Record<CategoryKey, MetricField[]> = {
  body: [
    {
      name: "weight",
      label: "Peso",
      unit: "kg",
      step: "0.1",
      placeholder: "75.0",
      min: 20,
      max: 300,
    },
    { name: "bodyFatPercentage", label: "% grasso", unit: "%", step: "0.1", min: 3, max: 60 },
    { name: "muscleMassKg", label: "Massa muscolare", unit: "kg", step: "0.1", min: 10, max: 120 },
    { name: "bodyWaterPct", label: "Acqua corporea", unit: "%", step: "0.1", min: 20, max: 80 },
  ],
  circumferences: [
    { name: "waistCm", label: "Vita", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "hipsCm", label: "Fianchi", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "chestCm", label: "Petto", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "armsCm", label: "Braccia", unit: "cm", step: "0.5", min: 10, max: 80 },
    { name: "thighCm", label: "Coscia", unit: "cm", step: "0.5", min: 20, max: 120 },
    { name: "calvesCm", label: "Polpaccio", unit: "cm", step: "0.5", min: 15, max: 80 },
  ],
  cardiovascular: [
    { name: "systolicBP", label: "PA sistolica", unit: "mmHg", step: "1", min: 60, max: 260 },
    { name: "diastolicBP", label: "PA diastolica", unit: "mmHg", step: "1", min: 30, max: 160 },
    { name: "restingHR", label: "FC riposo", unit: "bpm", step: "1", min: 25, max: 220 },
    { name: "spo2", label: "SpO2", unit: "%", step: "0.1", min: 50, max: 100 },
    { name: "hrv", label: "HRV", unit: "ms", step: "1", min: 0, max: 300 },
  ],
  metabolic: [
    {
      name: "glucoseFasting",
      label: "Glicemia digiuno",
      unit: "mg/dL",
      step: "1",
      min: 30,
      max: 500,
    },
    {
      name: "glucosePostMeal",
      label: "Glicemia post-pasto",
      unit: "mg/dL",
      step: "1",
      min: 30,
      max: 600,
    },
    { name: "ketones", label: "Chetoni", unit: "mmol/L", step: "0.1", min: 0, max: 10 },
    { name: "bodyTempC", label: "Temperatura", unit: "°C", step: "0.1", min: 30, max: 45 },
  ],
  sleep: [
    { name: "sleepBedtime", label: "A letto", type: "time", placeholder: "23:30" },
    { name: "sleepWakeTime", label: "Sveglia", type: "time", placeholder: "07:00" },
    {
      name: "sleepHours",
      label: "Ore dormite",
      unit: "h",
      step: "0.25",
      min: 0,
      max: 16,
      hint: "Calcolate automaticamente da 'A letto' e 'Sveglia', oppure inseriscile a mano.",
    },
    { name: "sleepQuality", label: "Qualità (1-10)", step: "1", min: 1, max: 10 },
    { name: "sleepAwakenings", label: "Risvegli", step: "1", min: 0, max: 20 },
  ],
  activity: [
    { name: "steps", label: "Passi", step: "1", min: 0, max: 100000 },
    { name: "caloriesBurned", label: "Kcal bruciate", step: "1", min: 0, max: 10000 },
    { name: "activeMinutes", label: "Minuti attivi", unit: "min", step: "1", min: 0, max: 1440 },
    { name: "distanceKm", label: "Distanza", unit: "km", step: "0.1", min: 0, max: 200 },
  ],
};

export type PrimaryKey = keyof BiometricLogDTO;

const PRIMARY: Record<
  CategoryKey,
  { key: PrimaryKey; label: string; unit?: string; decimals?: number }
> = {
  body: { key: "weight", label: "Peso", unit: "kg", decimals: 1 },
  circumferences: { key: "waistCm", label: "Vita", unit: "cm", decimals: 1 },
  cardiovascular: { key: "systolicBP", label: "PA sistolica", unit: "mmHg", decimals: 0 },
  metabolic: { key: "glucoseFasting", label: "Glicemia digiuno", unit: "mg/dL", decimals: 0 },
  sleep: { key: "sleepHours", label: "Ore dormite", unit: "h", decimals: 1 },
  activity: { key: "steps", label: "Passi", decimals: 0 },
};

// ── Periods ────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 7, label: "7g" },
  { key: 30, label: "30g" },
  { key: 90, label: "90g" },
  { key: 365, label: "1a" },
  { key: null, label: "tutto" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

// ── Component ──────────────────────────────────────────────────────────────

export function HealthTabs({ profile = EMPTY_PROFILE, patientId, readOnly }: Props) {
  const [category, setCategory] = React.useState<CategoryKey>("body");
  const [period, setPeriod] = React.useState<PeriodKey>(30);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [formCategory, setFormCategory] = React.useState<CategoryKey>("body");

  const { hidden, hydrated, toggle } = useHealthCategoryPrefs();
  const visibleCategories = React.useMemo(
    () => CATEGORIES.filter((c) => !hidden.has(c.key as HealthCategoryKey)),
    [hidden],
  );
  // Fall back to the full list before hydration so the first paint of
  // the tabs matches what the server rendered (nothing hidden yet).
  const effectiveCategories = hydrated ? visibleCategories : CATEGORIES;

  // Keep the selected tab valid: if the user hides the current category
  // switch to the first visible one.
  React.useEffect(() => {
    if (!hydrated) return;
    if (!effectiveCategories.some((c) => c.key === category)) {
      setCategory(effectiveCategories[0]?.key ?? "body");
    }
  }, [hydrated, effectiveCategories, category]);

  // Same for the dialog's form-category pill.
  React.useEffect(() => {
    if (!hydrated) return;
    if (!effectiveCategories.some((c) => c.key === formCategory)) {
      setFormCategory(effectiveCategories[0]?.key ?? "body");
    }
  }, [hydrated, effectiveCategories, formCategory]);

  const list = useBiometrics({ patientId, perPage: 500 });
  const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);
  const hasAnyData = items.length > 0;

  const periodItems = React.useMemo(() => {
    if (period == null) return items;
    // Date.now() here is safe: re-runs only when items/period change, not per render.
    // eslint-disable-next-line react-hooks/purity
    const cutoff = Date.now() - period * 24 * 60 * 60 * 1000;
    return items.filter((r) => new Date(r.date).getTime() >= cutoff);
  }, [items, period]);

  const openDialogFor = (c: CategoryKey) => {
    setFormCategory(c);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="La mia salute"
        description="Monitora peso, circonferenze, cuore, metabolismo, sonno e attività."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          !readOnly && (
            <div className="flex items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger
                  className="focus-ring border-input bg-background text-muted-foreground hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
                  aria-label="Scegli quali parametri mostrare"
                  title="Scegli quali parametri mostrare"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Parametri da tracciare</DialogTitle>
                    <DialogDescription>
                      Scegli quali categorie vuoi vedere nelle tue schermate di Dati Salute. Quelle
                      nascoste restano disponibili ma non occupano spazio.
                    </DialogDescription>
                  </DialogHeader>
                  <CategoryPrefsList
                    hidden={hidden}
                    onToggle={(k) => toggle(k as HealthCategoryKey)}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" aria-hidden />
                  Aggiungi rilevazione
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nuova rilevazione</DialogTitle>
                    <DialogDescription>
                      Inserisci uno o più valori. I campi vuoti vengono ignorati.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="border-border/60 flex flex-wrap gap-1 border-b pb-3">
                    {effectiveCategories.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setFormCategory(c.key)}
                        className={cn(
                          "focus-ring rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                          formCategory === c.key
                            ? "bg-primary-500/15 text-primary-500"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <MetricForm
                      key={formCategory}
                      category={formCategory}
                      fields={FIELDS[formCategory]}
                      dense
                      onSaved={() => setDialogOpen(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )
        }
      />

      {list.isLoading ? (
        <LoadingState />
      ) : !hasAnyData ? (
        <HealthEmptyState
          action={
            !readOnly && (
              <Button type="button" size="lg" onClick={() => openDialogFor("body")}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Registra la prima rilevazione
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Ring row ────────────────────────────── */}
          <HealthRingRow items={items} profile={profile} />

          {/* Category tabs ───────────────────────── */}
          <section className="flex flex-col gap-3">
            <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
              <TabsList>
                {effectiveCategories.map((c) => (
                  <TabsTrigger key={c.key} value={c.key}>
                    {c.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {effectiveCategories.map((c) => (
                <TabsContent key={c.key} value={c.key} className="mt-4 flex flex-col gap-4">
                  <CategoryPanel
                    category={c.key}
                    items={periodItems}
                    allItems={items}
                    period={period}
                    onPeriodChange={setPeriod}
                    onAdd={() => openDialogFor(c.key)}
                    readOnly={readOnly}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </>
      )}
    </div>
  );
}

// ── Category panel ─────────────────────────────────────────────────────────

function CategoryPanel({
  category,
  items,
  allItems,
  period,
  onPeriodChange,
  onAdd,
  readOnly,
}: {
  category: CategoryKey;
  items: BiometricLogDTO[];
  allItems: BiometricLogDTO[];
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  onAdd: () => void;
  readOnly?: boolean;
}) {
  const primary = PRIMARY[category];
  const numericValues = items
    .map((r) => r[primary.key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const series = React.useMemo(
    () =>
      items
        .slice()
        .reverse()
        .map((r) => ({
          date: r.date,
          value: typeof r[primary.key] === "number" ? (r[primary.key] as number) : null,
        })),
    [items, primary.key],
  );

  const stats = computeStats(numericValues);
  const firstLast = firstAndLast(items, primary.key);

  // Sleep wellness score + coach CTA (AT-2). Computed client-side over
  // the full list (not the period-filtered slice) so the rolling avg
  // uses a stable 14-day window regardless of the user's period toggle.
  const sleepSummary = React.useMemo(
    () => (category === "sleep" ? summarizeSleep(allItems) : null),
    [category, allItems],
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={primary.label}
        subtitle={
          primary.unit
            ? `Parametro in analisi · unità di misura: ${primary.unit}`
            : "Parametro in analisi"
        }
      />

      {sleepSummary && <SleepScoreCard summary={sleepSummary} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPills value={period} onChange={onPeriodChange} />
        <span className="text-muted-foreground text-xs">
          {items.length} rilevazioni nel periodo
        </span>
      </div>

      <MetricChart
        title={primary.label}
        unit={primary.unit}
        data={series}
        emptyLabel="Nessuna rilevazione in questo periodo."
      />

      <StatsGrid
        stats={stats}
        firstLast={firstLast}
        unit={primary.unit}
        decimals={primary.decimals ?? 1}
      />

      <RecentTable
        category={category}
        items={allItems.slice(0, 10)}
        readOnly={readOnly}
        onAdd={onAdd}
      />
    </div>
  );
}

function PeriodPills({ value, onChange }: { value: PeriodKey; onChange: (p: PeriodKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Periodo" className="inline-flex flex-wrap gap-1.5">
      {PERIODS.map((p) => {
        const active = value === p.key;
        return (
          <button
            key={p.label}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(p.key)}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary-500/40 bg-primary-500/15 text-primary-500"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────

type Stats = {
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
};

function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { min: null, max: null, avg: null, count: 0 };
  }
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / values.length, count: values.length };
}

function firstAndLast(
  items: BiometricLogDTO[],
  key: PrimaryKey,
): { first: number | null; last: number | null } {
  // items come in DESC order — first = oldest, last = newest within the slice.
  let first: number | null = null;
  let last: number | null = null;
  for (const r of items) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      if (last == null) last = v;
      first = v;
    }
  }
  return { first, last };
}

function StatsGrid({
  stats,
  firstLast,
  unit,
  decimals,
}: {
  stats: Stats;
  firstLast: { first: number | null; last: number | null };
  unit?: string;
  decimals: number;
}) {
  const delta =
    firstLast.first != null && firstLast.last != null ? firstLast.last - firstLast.first : null;
  const items = [
    { label: "Min", value: stats.min },
    { label: "Max", value: stats.max },
    { label: "Media", value: stats.avg },
    { label: "Delta", value: delta, signed: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="surface-1 rounded-xl p-3">
          <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
            {it.label}
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {it.value != null
              ? `${it.signed && it.value > 0 ? "+" : ""}${it.value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`
              : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recent table with inline delete ─────────────────────────────────────────

function RecentTable({
  category,
  items,
  readOnly,
  onAdd,
}: {
  category: CategoryKey;
  items: BiometricLogDTO[];
  readOnly?: boolean;
  onAdd: () => void;
}) {
  const del = useDeleteBiometric();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Eliminare questa rilevazione?")) return;
    setPendingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("Rilevazione eliminata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="surface-1 overflow-hidden rounded-xl">
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-xs font-semibold tracking-wide uppercase">
          Ultime {Math.min(10, items.length)} rilevazioni
        </h3>
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Aggiungi
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm">
          Nessuna rilevazione ancora.
        </p>
      ) : (
        <table className="w-full text-sm" aria-label="Ultime rilevazioni">
          <thead>
            <tr className="border-border/60 text-muted-foreground border-b text-[10px] tracking-wide uppercase">
              <th className="px-4 py-2 text-left font-medium">Data</th>
              <th className="px-4 py-2 text-left font-medium">Valore</th>
              <th className="px-4 py-2 text-left font-medium">Note</th>
              {!readOnly && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-border/60 divide-y">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="text-muted-foreground px-4 py-2 whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2 tabular-nums">{rowLabelFor(category, r) ?? "—"}</td>
                <td className="text-muted-foreground max-w-[240px] truncate px-4 py-2">
                  {r.notes ?? ""}
                </td>
                {!readOnly && (
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      disabled={pendingId === r.id}
                      aria-label={`Elimina rilevazione del ${new Date(r.date).toLocaleDateString("it-IT")}`}
                      className="focus-ring text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-50"
                    >
                      {pendingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function rowLabelFor(category: CategoryKey, r: BiometricLogDTO): string | null {
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
      if (r.bodyTempC != null) parts.push(`${r.bodyTempC} °C`);
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
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ── Loading state ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-[40vh] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" aria-label="Caricamento" />
    </div>
  );
}

// ── Preferences dialog body ────────────────────────────────────────────────

function CategoryPrefsList({
  hidden,
  onToggle,
}: {
  hidden: Set<HealthCategoryKey>;
  onToggle: (key: HealthCategoryKey) => void;
}) {
  // Block the user from hiding the last visible category — an empty
  // tab row would be confusing and has no useful state.
  const visibleCount = CATEGORIES.length - hidden.size;

  return (
    <ul className="divide-border/60 flex flex-col divide-y">
      {CATEGORIES.map((c) => {
        const isHidden = hidden.has(c.key as HealthCategoryKey);
        const isOnlyVisible = !isHidden && visibleCount <= 1;
        return (
          <li key={c.key} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-muted-foreground text-xs">{CATEGORY_DESCRIPTIONS[c.key]}</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="focus-ring border-input accent-primary h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-50"
                checked={!isHidden}
                disabled={isOnlyVisible}
                onChange={() => onToggle(c.key as HealthCategoryKey)}
                aria-label={`Mostra ${c.label}`}
              />
              <span className="text-muted-foreground text-xs">
                {isHidden ? "Nascosto" : "Visibile"}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  body: "Peso, massa grassa, massa muscolare, acqua.",
  circumferences: "Vita, fianchi, petto, braccia, coscia, polpaccio.",
  cardiovascular: "Pressione, frequenza cardiaca, SpO2, HRV.",
  metabolic: "Glicemia, chetoni, temperatura corporea.",
  sleep: "Ore, qualità, orari, risvegli.",
  activity: "Passi, calorie, minuti attivi, distanza.",
};
