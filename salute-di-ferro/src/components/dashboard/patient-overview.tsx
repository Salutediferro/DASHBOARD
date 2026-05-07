"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Target, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Sex } from "@prisma/client";

import { SortableCard } from "@/components/sortable-card";
import { cn } from "@/lib/utils";
import {
  OVERVIEW_MAX,
  OVERVIEW_METRIC_KEYS,
  useOverviewPrefs,
  type OverviewMetricKey,
} from "@/lib/hooks/use-overview-prefs";
import { useMetricTargets, type MetricTargetsMap } from "@/lib/hooks/use-metric-targets";
import { NoTrackedMetricsState } from "@/components/health/no-tracked-metrics-state";
import type { PatientKpis, PatientMetricKey } from "@/lib/queries/dashboard";
import type { MetricContext, MetricGrade } from "@/lib/health/metric-thresholds";
import {
  gradeBmi,
  gradeBloodPressure,
  gradeOverviewMetric,
} from "@/lib/health/grade-with-target";
import {
  BMICard,
  BloodPressureCard,
  CheckInsCard,
  NextAppointmentCard,
  SimpleMetricCard,
  WeightCard,
  WeightDeltaCard,
} from "./overview-cards";
import { EDITOR_CONFIG } from "./metric-editor-config";
import { MetricEditorDialog } from "./metric-editor-dialog";

interface PatientOverviewProps {
  kpis: PatientKpis;
  /** Patient bio used by the grading engine — sex (for body-comp/waist
   * bands) and target weight (for weight grading). Optional: when
   * omitted, those metrics fall back to neutral (no medical band). */
  profile?: {
    sex: Sex | null;
    heightCm: number | null;
    targetWeightKg: number | null;
  };
  /** Server-fetched targets used to seed React Query so cards render
   * with their grade colour on first paint. */
  initialTargets?: MetricTargetsMap;
  /** Server-rendered list of metrics the user has chosen to track —
   * filters the cards rendered here. Empty array means "first-onboarding
   * default", handled inside `useOverviewPrefs`. */
  initialSelectedMetrics?: readonly string[];
}

type MetricDef = {
  label: string;
  description: string;
  category: string;
  Component: React.FC<{ kpis: PatientKpis; grade?: MetricGrade | null }>;
};

// Map our card keys to the underlying entry in `kpis.metrics` (most are
// 1:1, but composite/aggregate cards have no direct match).
const PATIENT_METRIC_FOR: Partial<Record<OverviewMetricKey, PatientMetricKey>> = {
  weight: "weight",
  bmi: "bmi",
  bodyFat: "bodyFat",
  muscleMass: "muscleMass",
  bodyWater: "bodyWater",
  waist: "waist",
  hips: "hips",
  chest: "chest",
  arms: "arms",
  thigh: "thigh",
  calves: "calves",
  restingHR: "restingHR",
  spo2: "spo2",
  hrv: "hrv",
  glucoseFasting: "glucoseFasting",
  glucosePostMeal: "glucosePostMeal",
  bodyTempC: "bodyTempC",
  ketones: "ketones",
  sleepHours: "sleepHours",
  sleepQuality: "sleepQuality",
  sleepAwakenings: "sleepAwakenings",
  steps: "steps",
  caloriesBurned: "caloriesBurned",
  activeMinutes: "activeMinutes",
  distanceKm: "distanceKm",
  energyLevel: "energyLevel",
  mood: "mood",
  energy: "energy",
};

// Helper that wires SimpleMetricCard to a particular metric. Keeps the
// REGISTRY readable — every entry is a one-liner instead of an inline arrow.
function makeSimple(
  metricKey: Parameters<typeof SimpleMetricCard>[0]["metricKey"],
  label: string,
  unit?: string,
  invertDelta = false,
  format?: (v: number) => string,
): MetricDef["Component"] {
  const C: MetricDef["Component"] = ({ kpis, grade }) => (
    <SimpleMetricCard
      kpis={kpis}
      metricKey={metricKey}
      label={label}
      unit={unit}
      invertDelta={invertDelta}
      format={format}
      grade={grade}
    />
  );
  C.displayName = `SimpleMetricCard(${metricKey})`;
  return C;
}

const fmtInt = (v: number) => Math.round(v).toLocaleString("it-IT");
const fmt2 = (v: number) => v.toFixed(2);

const REGISTRY: Record<OverviewMetricKey, MetricDef> = {
  // ---- Generale ----
  weight: {
    label: "Peso corrente",
    description: "Ultimo peso registrato + tendenza 14 giorni con sparkline.",
    category: "Generale",
    Component: WeightCard,
  },
  weightDelta: {
    label: "Variazione peso",
    description: "Differenza in kg rispetto a 14 giorni fa, in evidenza.",
    category: "Generale",
    Component: WeightDeltaCard,
  },
  bmi: {
    label: "BMI",
    description: "Indice di massa corporea con classificazione (sotto, normo, sopra, obesità).",
    category: "Generale",
    Component: BMICard,
  },
  checkIns: {
    label: "Check-in settimana",
    description: "Conteggio della settimana corrente + barre dei 14 giorni precedenti.",
    category: "Generale",
    Component: CheckInsCard,
  },
  nextAppointment: {
    label: "Prossimo appuntamento",
    description: "Data del prossimo impegno + scorciatoia agli appuntamenti.",
    category: "Generale",
    Component: NextAppointmentCard,
  },

  // ---- Composizione corporea ----
  bodyFat: {
    label: "Massa grassa",
    description: "Percentuale di grasso corporeo dall'ultima rilevazione.",
    category: "Composizione corporea",
    Component: makeSimple("bodyFat", "Massa grassa", "%", true),
  },
  muscleMass: {
    label: "Massa muscolare",
    description: "Massa muscolare in kg dall'ultima rilevazione.",
    category: "Composizione corporea",
    Component: makeSimple("muscleMass", "Massa muscolare", "kg"),
  },
  bodyWater: {
    label: "Acqua corporea",
    description: "Percentuale di acqua corporea totale.",
    category: "Composizione corporea",
    Component: makeSimple("bodyWater", "Acqua corporea", "%"),
  },

  // ---- Circonferenze ----
  waist: {
    label: "Vita",
    description: "Circonferenza vita (cm) — utile per il rischio metabolico.",
    category: "Circonferenze",
    Component: makeSimple("waist", "Vita", "cm", true),
  },
  hips: {
    label: "Fianchi",
    description: "Circonferenza fianchi (cm).",
    category: "Circonferenze",
    Component: makeSimple("hips", "Fianchi", "cm"),
  },
  chest: {
    label: "Torace",
    description: "Circonferenza torace (cm).",
    category: "Circonferenze",
    Component: makeSimple("chest", "Torace", "cm"),
  },
  arms: {
    label: "Braccia",
    description: "Circonferenza braccia (cm).",
    category: "Circonferenze",
    Component: makeSimple("arms", "Braccia", "cm"),
  },
  thigh: {
    label: "Cosce",
    description: "Circonferenza cosce (cm).",
    category: "Circonferenze",
    Component: makeSimple("thigh", "Cosce", "cm"),
  },
  calves: {
    label: "Polpacci",
    description: "Circonferenza polpacci (cm).",
    category: "Circonferenze",
    Component: makeSimple("calves", "Polpacci", "cm"),
  },

  // ---- Pressione e cuore ----
  bloodPressure: {
    label: "Pressione arteriosa",
    description: "Sistolica/diastolica (mmHg) con classificazione.",
    category: "Pressione e cuore",
    Component: BloodPressureCard,
  },
  restingHR: {
    label: "Frequenza a riposo",
    description: "Battiti per minuto a riposo (bpm).",
    category: "Pressione e cuore",
    Component: makeSimple("restingHR", "Freq. a riposo", "bpm", true, fmtInt),
  },
  spo2: {
    label: "Saturazione O₂",
    description: "Saturazione di ossigeno nel sangue (%).",
    category: "Pressione e cuore",
    Component: makeSimple("spo2", "SpO₂", "%"),
  },
  hrv: {
    label: "HRV",
    description: "Variabilità della frequenza cardiaca (ms).",
    category: "Pressione e cuore",
    Component: makeSimple("hrv", "HRV", "ms", false, fmtInt),
  },

  // ---- Metabolico ----
  glucoseFasting: {
    label: "Glicemia a digiuno",
    description: "Glicemia 8h dopo il pasto (mg/dL).",
    category: "Metabolico",
    Component: makeSimple("glucoseFasting", "Glicemia a digiuno", "mg/dL", true, fmtInt),
  },
  glucosePostMeal: {
    label: "Glicemia post-pasto",
    description: "Glicemia 2h dopo il pasto (mg/dL).",
    category: "Metabolico",
    Component: makeSimple("glucosePostMeal", "Glicemia post-pasto", "mg/dL", true, fmtInt),
  },
  bodyTempC: {
    label: "Temperatura corporea",
    description: "Temperatura in gradi Celsius.",
    category: "Metabolico",
    Component: makeSimple("bodyTempC", "Temperatura", "°C"),
  },
  ketones: {
    label: "Chetoni",
    description: "Chetoni nel sangue (mmol/L).",
    category: "Metabolico",
    Component: makeSimple("ketones", "Chetoni", "mmol/L", false, fmt2),
  },

  // ---- Sonno ----
  sleepHours: {
    label: "Ore di sonno",
    description: "Ore di sonno dell'ultima notte registrata.",
    category: "Sonno",
    Component: makeSimple("sleepHours", "Ore di sonno", "h"),
  },
  sleepQuality: {
    label: "Qualità sonno",
    description: "Auto-valutazione qualità sonno (1–10).",
    category: "Sonno",
    Component: makeSimple("sleepQuality", "Qualità sonno", "/10", false, fmtInt),
  },
  sleepAwakenings: {
    label: "Risvegli notturni",
    description: "Numero di risvegli durante la notte.",
    category: "Sonno",
    Component: makeSimple("sleepAwakenings", "Risvegli", undefined, true, fmtInt),
  },

  // ---- Attività ----
  steps: {
    label: "Passi",
    description: "Passi giornalieri.",
    category: "Attività",
    Component: makeSimple("steps", "Passi", undefined, false, fmtInt),
  },
  caloriesBurned: {
    label: "Calorie bruciate",
    description: "Stima delle calorie bruciate (kcal).",
    category: "Attività",
    Component: makeSimple("caloriesBurned", "Calorie bruciate", "kcal", false, fmtInt),
  },
  activeMinutes: {
    label: "Minuti attivi",
    description: "Minuti di attività intensa nella giornata.",
    category: "Attività",
    Component: makeSimple("activeMinutes", "Minuti attivi", "min", false, fmtInt),
  },
  distanceKm: {
    label: "Distanza percorsa",
    description: "Distanza giornaliera (km).",
    category: "Attività",
    Component: makeSimple("distanceKm", "Distanza", "km"),
  },

  // ---- Benessere ----
  mood: {
    label: "Umore (diario)",
    description: "Auto-valutazione umore dal diario (1–5).",
    category: "Benessere",
    Component: makeSimple("mood", "Umore", "/5", false, fmtInt),
  },
  energy: {
    label: "Energia (diario)",
    description: "Auto-valutazione energia dal diario (1–5).",
    category: "Benessere",
    Component: makeSimple("energy", "Energia", "/5", false, fmtInt),
  },
  energyLevel: {
    label: "Livello energia",
    description: "Energia auto-riferita nel pannello biometrico (1–10).",
    category: "Benessere",
    Component: makeSimple("energyLevel", "Livello energia", "/10", false, fmtInt),
  },
};

// Compact chip text for the on-card target indicator. Reuses the same
// units the editor's input shows to avoid surprise mismatches.
function formatTargetChip(
  key: OverviewMetricKey,
  value: import("@/lib/hooks/use-metric-targets").MetricTargetValue | undefined,
): string | null {
  if (value == null) return null;
  if (typeof value === "object") {
    return `${Math.round(value.systolic)}/${Math.round(value.diastolic)}`;
  }
  // Integers vs decimals: pick decimals based on the metric's natural unit.
  const integerKeys: OverviewMetricKey[] = [
    "restingHR",
    "hrv",
    "glucoseFasting",
    "glucosePostMeal",
    "sleepQuality",
    "sleepAwakenings",
    "steps",
    "caloriesBurned",
    "activeMinutes",
    "energyLevel",
    "mood",
    "energy",
  ];
  return integerKeys.includes(key)
    ? Math.round(value).toLocaleString("it-IT")
    : value.toFixed(1);
}

// Tailwind needs the literal class strings to be present somewhere it
// can statically scan, otherwise `lg:grid-cols-3` etc. get purged. We
// cap the per-row count at 4 visually; selection is unbounded so a row
// of 6 just wraps to two rows.
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function PatientOverview({
  kpis,
  profile,
  initialTargets,
  initialSelectedMetrics,
}: PatientOverviewProps) {
  const { selected, setOrder, toggle } = useOverviewPrefs(initialSelectedMetrics);
  const { targets, hydrated: targetsHydrated } = useMetricTargets({ initialData: initialTargets });
  const [editorKey, setEditorKey] = React.useState<OverviewMetricKey | null>(null);
  // Default to the cap so the dashboard stays scannable; the user can
  // expand to see everything they track. Only persists for the session
  // — coming back fresh re-collapses, which is the right default for
  // "open the app, glance at top-of-mind metrics".
  const [expanded, setExpanded] = React.useState(false);

  const visible = selected.filter((k) =>
    (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
  ) as OverviewMetricKey[];
  const overflow = Math.max(0, visible.length - OVERVIEW_MAX);
  const displayed = expanded ? visible : visible.slice(0, OVERVIEW_MAX);
  const cols = LG_COLS[Math.min(displayed.length, 4)] ?? LG_COLS[4];

  // Shared context for `gradeMetric` (sex-specific bands, target weight
  // for trend-aware weight grading).
  const metricCtx: MetricContext = React.useMemo(
    () => ({
      sex: profile?.sex ?? null,
      targetWeightKg: profile?.targetWeightKg ?? null,
      currentWeightKg: kpis.currentWeightKg,
      previousWeightKg: null, // 14-day window is too short to be reliable here
    }),
    [profile?.sex, profile?.targetWeightKg, kpis.currentWeightKg],
  );

  // Compute the grade for each visible card. Targets that are still
  // hydrating read as "no target", which means SSR == first paint and
  // we don't flash a colour.
  const gradeFor = React.useCallback(
    (key: OverviewMetricKey): MetricGrade | null => {
      if (!targetsHydrated) return null;
      const t = targets[key];
      if (key === "bloodPressure") {
        const sys = kpis.metrics.systolicBP.current;
        const dia = kpis.metrics.diastolicBP.current;
        const bp = t && typeof t === "object" ? t : null;
        return gradeBloodPressure(sys, dia, metricCtx, bp);
      }
      if (key === "bmi") {
        return kpis.bmi != null
          ? gradeBmi(kpis.bmi, typeof t === "number" ? t : null)
          : null;
      }
      const pmKey = PATIENT_METRIC_FOR[key];
      if (!pmKey) return null; // weightDelta / checkIns / nextAppointment
      const value = kpis.metrics[pmKey].current;
      if (value == null) return null;
      return gradeOverviewMetric(key, value, {
        ...metricCtx,
        userTarget: typeof t === "number" ? t : null,
      });
    },
    [kpis, targets, targetsHydrated, metricCtx],
  );

  // Require ~5 px of pointer movement before a drag starts, so a click on
  // the link/card body isn't intercepted by the sortable wrapper.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = visible.indexOf(active.id as OverviewMetricKey);
    const to = visible.indexOf(over.id as OverviewMetricKey);
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(visible, from, to));
  }

  if (visible.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <NoTrackedMetricsState />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayed} strategy={rectSortingStrategy}>
          <div className={cn("grid gap-3 grid-cols-1 sm:grid-cols-2", cols)}>
            {displayed.map((key) => {
              const def = REGISTRY[key];
              const Component = def.Component;
              const editable = EDITOR_CONFIG[key] != null;
              const grade = gradeFor(key);
              const canRemove = visible.length > 1;
              const target = targets[key];
              const targetLabel = formatTargetChip(key, target);
              return (
                <SortableCard key={key} id={key}>
                  {/* Trash button — un-tracks the metric in the user's
                      selectedMetrics (server-backed via useOverviewPrefs).
                      The metric also disappears from the health page and
                      the rilevazione form, so the title spells that out
                      rather than implying a dashboard-only effect. */}
                  {canRemove && (
                    <button
                      type="button"
                      aria-label={`Smetti di tracciare ${def.label}`}
                      title={`Smetti di tracciare ${def.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(key);
                      }}
                      className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive absolute top-1.5 right-7 z-10 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => setEditorKey(key)}
                      aria-label={`Modifica ${def.label}`}
                      className="focus-ring block size-full cursor-pointer rounded-xl text-left transition-all hover:brightness-[1.04] hover:ring-1 hover:ring-primary/30 active:scale-[0.99]"
                    >
                      <Component kpis={kpis} grade={grade} />
                    </button>
                  ) : (
                    <Component kpis={kpis} grade={grade} />
                  )}
                  {/* Target chip — visible confirmation that the user's
                      target was saved server-side. Sits at the bottom-right
                      so it doesn't collide with the drag/trash controls. */}
                  {targetLabel && (
                    <span
                      className="border-border/60 bg-background/90 text-muted-foreground pointer-events-none absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tabular-nums backdrop-blur-sm"
                      title={`Obiettivo: ${targetLabel}`}
                    >
                      <Target className="h-2.5 w-2.5" aria-hidden />
                      {targetLabel}
                    </span>
                  )}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {overflow > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="focus-ring text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-xs font-medium transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                Mostra meno
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                Mostra tutte ({visible.length})
              </>
            )}
          </button>
        </div>
      )}

      {editorKey && (
        <MetricEditorDialog
          open={!!editorKey}
          onOpenChange={(o) => {
            if (!o) setEditorKey(null);
          }}
          metricKey={editorKey}
          label={REGISTRY[editorKey].label}
        />
      )}
    </section>
  );
}

