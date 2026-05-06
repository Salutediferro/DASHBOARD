"use client";

import * as React from "react";
import { Loader2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Sex } from "@prisma/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useOverviewPrefs } from "@/lib/hooks/use-overview-prefs";

import PageHeader from "@/components/brand/page-header";
import SectionHeader from "@/components/brand/section-header";
import { MetricChart } from "@/components/health/metric-chart";
import HealthEmptyState from "@/components/health/health-empty-state";
import { NoTrackedMetricsState } from "@/components/health/no-tracked-metrics-state";
import { AddBiometricDialog } from "@/components/health/add-biometric-dialog";
import { EditMetricsButton } from "@/components/profile/edit-metrics-button";
import { CATEGORIES, type CategoryKey } from "@/components/health/metric-fields";
import { SleepScoreCard } from "@/components/health/sleep-score-card";
import { summarizeSleep } from "@/lib/health/sleep-score";
import { SKINFOLD_SITES, SKINFOLD_LABELS, gradeSkinfold } from "@/lib/health/skinfold-thresholds";
import {
  METRIC_GRADE_LABELS,
  findLatestNumeric,
  type MetricGrade,
} from "@/lib/health/metric-thresholds";
import { HealthRingRow } from "./health-ring-row";
import { MetricEditorDialog } from "@/components/dashboard/metric-editor-dialog";
import {
  FIELD_TO_OVERVIEW_KEY,
  OVERVIEW_KEY_TO_HEALTH_CATEGORY,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { useMetricTargets, type MetricTargetsMap } from "@/lib/hooks/use-metric-targets";
import { directionForPrimary } from "@/lib/health/metric-direction";
import { glossaryFor } from "@/lib/health/metric-glossary";

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
  /** Server-fetched personal targets (drives card grading). Seeds React
   * Query so first paint already reflects the user's targets. */
  initialTargets?: MetricTargetsMap;
  /** Server-rendered list of metrics the user wants to track — filters
   * tabs, cards, and the rilevazione form. */
  initialSelectedMetrics?: readonly string[];
};

const EMPTY_PROFILE: PatientProfile = {
  targetWeightKg: null,
  heightCm: null,
  sex: null,
};

export type PrimaryKey = keyof BiometricLogDTO;

const PRIMARY: Record<
  CategoryKey,
  { key: PrimaryKey; label: string; unit?: string; decimals?: number }
> = {
  body: { key: "weight", label: "Peso", unit: "kg", decimals: 1 },
  circumferences: { key: "waistCm", label: "Vita", unit: "cm", decimals: 1 },
  skinfolds: { key: "abdominalSkinfoldMm", label: "Plica addominale", unit: "mm", decimals: 1 },
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

export function HealthTabs({
  profile = EMPTY_PROFILE,
  patientId,
  readOnly,
  initialTargets,
  initialSelectedMetrics,
}: Props) {
  const { targets } = useMetricTargets({ initialData: initialTargets });
  // Patient's tracked-metrics list. For professional read-only views we
  // skip the filter — the doctor/coach must see every metric they may
  // need to discuss, regardless of the patient's UI preference.
  const {
    selected: trackedMetrics,
    toggle: toggleTracked,
    setOrder: setTrackedOrder,
  } = useOverviewPrefs(initialSelectedMetrics);
  const trackedSet = React.useMemo(
    () => (readOnly ? null : new Set<string>(trackedMetrics)),
    [readOnly, trackedMetrics],
  );
  // A category is visible if the user tracks at least one overview
  // metric that maps to it. We resolve via OVERVIEW_KEY_TO_HEALTH_CATEGORY
  // (key→category) instead of FIELDS (category→fields) so derived
  // metrics with no editable input — `bmi` is the canonical one — still
  // surface their category. Specialty categories like skinfolds have
  // no overview-vocabulary entries and stay hidden by design.
  // Read-only views (professional) bypass the filter entirely.
  const categoryHasTracked = React.useCallback(
    (key: CategoryKey): boolean => {
      if (!trackedSet) return true;
      for (const tracked of trackedSet) {
        if (OVERVIEW_KEY_TO_HEALTH_CATEGORY[tracked as OverviewMetricKey] === key) {
          return true;
        }
      }
      return false;
    },
    [trackedSet],
  );
  const [category, setCategory] = React.useState<CategoryKey>("body");
  const [period, setPeriod] = React.useState<PeriodKey>(30);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [formCategory, setFormCategory] = React.useState<CategoryKey>("body");
  // Per-card click-to-edit dialog. `null` = closed; otherwise the
  // overview-card key whose editor is open.
  const [editorKey, setEditorKey] = React.useState<OverviewMetricKey | null>(null);
  const [editorLabel, setEditorLabel] = React.useState<string>("");
  const openEditor = React.useCallback((key: OverviewMetricKey, label: string) => {
    setEditorKey(key);
    setEditorLabel(label);
  }, []);

  const { hidden, hydrated } = useHealthCategoryPrefs();
  const visibleCategories = React.useMemo(
    () =>
      CATEGORIES.filter(
        (c) => !hidden.has(c.key as HealthCategoryKey) && categoryHasTracked(c.key),
      ),
    [hidden, categoryHasTracked],
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
  const items = React.useMemo(() => list.data?.items ?? [], [list.data?.items]);
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
        className="-mx-4 -mt-4 w-[calc(100%+54px)] md:-mx-8 md:-mt-8"
        actions={
          !readOnly && (
            <EditMetricsButton
              aria-label="Modifica metriche tracciate"
              className="focus-ring border-input bg-background text-muted-foreground hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Modifica metriche
            </EditMetricsButton>
          )
        }
      />

      {!readOnly && (
        <AddBiometricDialog
          initialSelectedMetrics={initialSelectedMetrics}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={formCategory}
          onCategoryChange={setFormCategory}
          hideTrigger
        />
      )}

      {list.isLoading ? (
        <LoadingState />
      ) : !readOnly && effectiveCategories.length === 0 ? (
        // No tracked metric maps to a category with biometric fields —
        // either the user cleared the list or their selection only
        // covers computed/aggregate keys (BMI, check-ins, …) that
        // don't surface here. Skip the rings + tabs and explain the
        // state instead of rendering an empty page.
        <NoTrackedMetricsState />
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
          <HealthRingRow
            items={items}
            profile={profile}
            targets={targets}
            onCardClick={readOnly ? undefined : openEditor}
            trackedMetrics={readOnly ? null : trackedMetrics}
            onUntrack={readOnly ? undefined : toggleTracked}
            onReorder={readOnly ? undefined : setTrackedOrder}
            onAdd={readOnly ? undefined : () => setDialogOpen(true)}
          />

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
                  {c.key === "skinfolds" && <SkinfoldsGrid items={items} sex={profile.sex} />}
                  <CategoryPanel
                    category={c.key}
                    items={periodItems}
                    allItems={items}
                    period={period}
                    onPeriodChange={setPeriod}
                    onAdd={() => openDialogFor(c.key)}
                    readOnly={readOnly}
                    targets={targets}
                    profile={profile}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </>
      )}
      {editorKey && (
        <MetricEditorDialog
          open={!!editorKey}
          onOpenChange={(o) => {
            if (!o) setEditorKey(null);
          }}
          metricKey={editorKey}
          label={editorLabel}
        />
      )}
    </div>
  );
}

// ── Category panel ─────────────────────────────────────────────────────────

const CATEGORIES_KEYS: Record<CategoryKey, PrimaryKey[]> = {
  sleep: ["sleepBedtime", "sleepAwakenings", "sleepHours", "sleepQuality", "sleepWakeTime"],
  cardiovascular: ["systolicBP", "diastolicBP", "restingHR", "spo2", "hrv"],
  body: ["weight", "muscleMassKg", "bodyWaterPct"],
  circumferences: ["waistCm", "hipsCm", "armsCm", "chestCm", "thighCm", "calvesCm"],
  skinfolds: [
    "chestSkinfoldMm",
    "abdominalSkinfoldMm",
    "thighSkinfoldMm",
    "suprailiacSkinfoldMm",
    "subscapularSkinfoldMm",
    "midaxillarySkinfoldMm",
    "tricepsSkinfoldMm",
    "calfSkinfoldMm",
  ],
  metabolic: ["glucoseFasting", "glucosePostMeal", "ketones", "bodyTempC"],
  activity: ["steps", "caloriesBurned", "activeMinutes", "distanceKm"],
};

function CategoryPanel({
  category,
  items,
  allItems,
  period,
  onPeriodChange,
  onAdd,
  readOnly,
  targets,
  profile,
}: {
  category: CategoryKey;
  items: BiometricLogDTO[];
  allItems: BiometricLogDTO[];
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  onAdd: () => void;
  readOnly?: boolean;
  targets: MetricTargetsMap;
  profile: PatientProfile;
}) {
  const primary = PRIMARY[category];
  // Resolve a numeric target for this category's primary field. The
  // chart plots a single line per panel, so for blood pressure (the
  // only composite) we pick the systolic side — the cardiovascular
  // tab's primary is `systolicBP`. Falls back to `targetWeightKg` for
  // weight so the gradient lights up before the user adds a server
  // MetricTarget. Skinfolds aren't in the overview vocabulary, so
  // their tab keeps the brand-red chart (the SkinfoldsGrid above
  // handles their per-site bands separately).
  const overviewKey = FIELD_TO_OVERVIEW_KEY[primary.key];
  const chartTarget: number | null = (() => {
    if (!overviewKey) return null;
    const t = targets[overviewKey];
    if (typeof t === "number") return t;
    if (t && typeof t === "object") {
      if (primary.key === "systolicBP") return t.systolic;
      if (primary.key === "diastolicBP") return t.diastolic;
      return null;
    }
    if (primary.key === "weight") return profile.targetWeightKg;
    return null;
  })();
  const chartDirection = directionForPrimary(primary.key);
  const glossary = glossaryFor(primary.key);
  // SectionHeader subtitle accepts ReactNode — append a small italic
  // explanation when the metric is the kind a user might wonder
  // about ("HRV", "FC riposo", glycaemia, …). The unit line stays as
  // before so the visual rhythm of the page doesn't change.
  const subtitleNode = (
    <>
      <span>
        {primary.unit
          ? `Parametro in analisi · unità di misura: ${primary.unit}`
          : "Parametro in analisi"}
      </span>
      {glossary?.description && (
        <span className="text-muted-foreground mt-1 block text-xs italic">
          {glossary.description}
        </span>
      )}
    </>
  );
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

  const i = React.useMemo(() => {
    const keys = CATEGORIES_KEYS[category];
    return allItems.filter((i) => keys.some((k) => i[k] !== null));
  }, [category, allItems]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title={primary.label} subtitle={subtitleNode} />

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
        target={chartTarget}
        direction={chartDirection}
      />

      <StatsGrid
        stats={stats}
        firstLast={firstLast}
        unit={primary.unit}
        decimals={primary.decimals ?? 1}
      />

      <RecentTable category={category} items={i.slice(0, 10)} readOnly={readOnly} onAdd={onAdd} />
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
    case "skinfolds": {
      const sum = sumSkinfolds(r);
      if (sum != null) parts.push(`Σ ${sum.toFixed(1)} mm`);
      break;
    }
    case "cardiovascular":
      if (r.systolicBP != null && r.diastolicBP != null)
        parts.push(`${r.systolicBP}/${r.diastolicBP}`);
      if (r.restingHR != null) parts.push(`${r.restingHR} bpm`);
      break;
    case "metabolic":
      if (r.glucoseFasting != null) parts.push(`${r.glucoseFasting.toFixed(2)} mg/dL`);
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

// ── Traffic-light grids ────────────────────────────────────────────────────

const GRADE_TONE: Record<MetricGrade, string> = {
  green: "border-emerald-500/60 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  yellow: "border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300",
  red: "border-red-500/75 bg-red-500/25 text-red-700 dark:text-red-300",
};

const GRADE_LABEL_OVERRIDE: Partial<Record<string, Record<MetricGrade, string>>> = {
  // Weight is graded relatively against `targetWeightKg` — the generic
  // "Buono / Attenzione / Fuori range" labels read as absolute, so swap
  // them for goal-oriented copy.
  weight: { green: "Vicino al target", yellow: "In progresso", red: "Fermo o lontano" },
};

function MetricGradeCard({
  label,
  unit,
  decimals,
  latest,
  grade,
  gradeKey,
  onClick,
}: {
  label: string;
  unit?: string;
  decimals: number;
  latest: { value: number; date: string } | null;
  grade: MetricGrade | null;
  /** Optional metric key — used to look up label overrides (e.g. weight). */
  gradeKey?: string;
  /** When provided, the card becomes a button that opens the editor. */
  onClick?: () => void;
}) {
  const override = gradeKey ? GRADE_LABEL_OVERRIDE[gradeKey] : undefined;
  const labelMap = override ?? METRIC_GRADE_LABELS;
  const className = cn(
    "flex flex-col gap-1 rounded-xl border p-3 transition-colors text-left",
    grade ? GRADE_TONE[grade] : "border-border/60 bg-muted/30 text-foreground",
    onClick && "focus-ring hover:brightness-105 cursor-pointer",
  );
  const body = (
    <>
      <p className="text-[10px] tracking-wide uppercase opacity-80">{label}</p>
      <p className="font-heading text-2xl font-semibold tabular-nums">
        {latest ? latest.value.toFixed(decimals) : "—"}
        {latest && unit && <span className="ml-1 text-sm font-normal opacity-70">{unit}</span>}
      </p>
      {latest && grade && <p className="text-[11px] font-medium opacity-90">{labelMap[grade]}</p>}
      {latest && (
        <p className="text-[10px] opacity-70">
          {new Date(latest.date).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={`Modifica ${label}`}
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

// ── Skinfolds (specialised: shows Σ of all sites) ──────────────────────────

function sumSkinfolds(r: BiometricLogDTO): number | null {
  let total = 0;
  let any = false;
  for (const site of SKINFOLD_SITES) {
    const v = r[site];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}

function SkinfoldsGrid({ items, sex }: { items: BiometricLogDTO[]; sex: Sex | null }) {
  let latestSum: { value: number; date: string } | null = null;
  for (const r of items) {
    const s = sumSkinfolds(r);
    if (s != null) {
      latestSum = { value: s, date: r.date };
      break;
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Plicometrie"
        subtitle={
          sex
            ? "Verde = tirato come da competizione · giallo = nella media · rosso = sopra soglia."
            : "Imposta il sesso nel profilo per attivare i colori a semaforo."
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SKINFOLD_SITES.map((site) => {
          const latest = findLatestNumeric(items, site);
          const grade = latest ? gradeSkinfold(site, latest.value, sex) : null;
          return (
            <MetricGradeCard
              key={site}
              label={SKINFOLD_LABELS[site]}
              unit="mm"
              decimals={1}
              latest={latest}
              grade={grade}
            />
          );
        })}
      </div>
      {latestSum && (
        <p className="text-muted-foreground text-xs">
          Σ ultime pliche:{" "}
          <span className="text-foreground font-semibold tabular-nums">
            {latestSum.value.toFixed(1)} mm
          </span>
        </p>
      )}
    </section>
  );
}

// ── Loading state ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-[40vh] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" aria-label="Caricamento" />
    </div>
  );
}
