"use client";

import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";
import { SectionHeader } from "../brand";
import { SortableCard } from "../sortable-card";
import { MetricRingCard, type RingMetric } from "./metric-ring-card";
import type { PatientProfile, PrimaryKey } from "./health-tabs";
import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import { useLocalStorageState } from "ahooks";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";

import { FIELD_TO_OVERVIEW_KEY, type OverviewMetricKey } from "@/lib/overview-metric-keys";
import type { MetricTargetsMap } from "@/lib/hooks/use-metric-targets";
import { effectiveTargetFor, gradeForHealthCard } from "@/lib/health/grade-with-target";
import {
  findLatestNumeric,
  findPreviousNumeric,
  type MetricContext,
  type MetricGrade,
} from "@/lib/health/metric-thresholds";
import { EDITOR_CONFIG } from "@/components/dashboard/metric-editor-config";

function latestOf(items: BiometricLogDTO[], key: PrimaryKey): number | null {
  for (const r of items) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function progressLowerBetter(current: number | null, target: number | null): number {
  if (current == null || target == null || target === 0) return 0;
  if (current <= target) return 1;
  return Math.max(0, Math.min(1, target / current));
}

export function getMapping(key: PrimaryKey): MetricConfig | undefined {
  const values = Object.values(METRICS)
    .map((o) => Object.entries(o))
    .flat();

  const map = values.find(([k]) => k === key);
  if (map) return map[1];
}

// Sex-specific medical reference defaults used as a fallback target when
// the user hasn't set their own. Mirrors the bands in metric-thresholds
// (waist cardio-metabolic cut-offs, ACE body-fat fitness midpoint).
function fallbackTargetFor(key: PrimaryKey, profile: PatientProfile): number | null {
  const isFemale = profile.sex === "FEMALE";
  switch (key) {
    case "weight":
      return profile.targetWeightKg;
    case "bmi":
      return 22;
    case "waistCm":
      return isFemale ? 80 : 94;
    case "bodyFatPercentage":
      return isFemale ? 22 : 15;
    default:
      return null;
  }
}

function computeRingMetrics(
  items: BiometricLogDTO[],
  profile: PatientProfile,
  selected: PrimaryKey[],
  targets: MetricTargetsMap,
): RingMetric[] {
  const latest: [PrimaryKey, number | null][] = selected.map((k) => [k, latestOf(items, k)]);

  return latest.map(([key, value]) => {
    const mapping = getMapping(key);
    // BP-composite cards aren't shown in the rings (METRICS lists sys/dia
    // separately), but we still resolve their target from the composite
    // entry so each individual ring respects the user's chosen value.
    let target: number | null = null;
    if (key === "systolicBP" || key === "diastolicBP") {
      const t = targets.bloodPressure;
      if (t && typeof t === "object") {
        target = key === "systolicBP" ? t.systolic : t.diastolic;
      }
    } else {
      target = effectiveTargetFor(key, fallbackTargetFor(key, profile), targets);
    }

    return {
      key,
      name: key as string,
      unit: mapping?.unit ?? "",
      label: mapping?.label ?? key[0].toUpperCase() + key.slice(1),
      target,
      value,
      progress: progressLowerBetter(value, target),
    };
  });
}

interface HealthRingRowProps {
  items: BiometricLogDTO[];
  profile: PatientProfile;
  /** Server-side targets keyed by overview-card vocabulary. */
  targets: MetricTargetsMap;
  /** When set, each ring becomes clickable and opens the editor. */
  onCardClick?: (key: OverviewMetricKey, label: string) => void;
}

export type MetricConfig = { label: string; unit?: string };

export const METRICS: Record<string, Partial<Record<PrimaryKey, MetricConfig>>> = {
  Corporei: {
    weight: { label: "Peso", unit: "kg" },
    bmi: { label: "BMI" },
    bodyFatPercentage: { label: "% Grasso" },
    muscleMassKg: { label: "Massa muscolare", unit: "kg" },
    bodyWaterPct: { label: "Acqua corporea", unit: "%" },
  },
  Circonferenze: {
    waistCm: { label: "Vita", unit: "cm" },
    hipsCm: { label: "Fianchi", unit: "cm" },
    chestCm: { label: "Petto", unit: "cm" },
    armsCm: { label: "Braccia", unit: "cm" },
    thighCm: { label: "Coscia", unit: "cm" },
    calvesCm: { label: "Polpaccio", unit: "cm" },
  },
  Cardiovascolare: {
    systolicBP: { label: "PA sistolica", unit: "mmHg" },
    diastolicBP: { label: "PA diastolica", unit: "mmHg" },
    restingHR: { label: "FC riposo", unit: "bpm" },
    spo2: { label: "SpO2", unit: "%" },
    hrv: { label: "HRV", unit: "ms" },
  },
  Metabolica: {
    glucoseFasting: { label: "Glicemia digiuno", unit: "mg/dL" },
    glucosePostMeal: { label: "Glicemia post-pasto", unit: "mg/dL" },
    ketones: { label: "Chetoni", unit: "mmol/L" },
    bodyTempC: { label: "Temperatura corporea", unit: "°C" },
  },
  Sonno: {
    sleepHours: { label: "Ore dormite", unit: "h" },
    sleepQuality: { label: "Qualità del sonno" },
    sleepAwakenings: { label: "Risvegli" },
  },
  Attività: {
    steps: { label: "Passi" },
    caloriesBurned: { label: "Kcal bruciate" },
    activeMinutes: { label: "Minuti attivi", unit: "min" },
    distanceKm: { label: "Distanza", unit: "km" },
  },
} as const;

export function HealthRingRow({ items, profile, targets, onCardClick }: HealthRingRowProps) {
  const [editing, setEditing] = useState(false);
  const [metrics, setMetrics] = useLocalStorageState<PrimaryKey[]>("tracked-metrics", {
    defaultValue: ["weight", "bmi", "waistCm", "bodyFatPercentage"],
  });

  const rings = useMemo(
    () => computeRingMetrics(items, profile, metrics ?? [], targets),
    [items, profile, metrics, targets],
  );

  // Grading context — same shape MetricsGrid uses, including trend-aware
  // weight grading via the previous reading.
  const metricCtx: MetricContext = useMemo(() => {
    const latestWeight = findLatestNumeric(items, "weight");
    const prevWeight = latestWeight
      ? findPreviousNumeric(items, "weight", latestWeight.date)
      : null;
    return {
      sex: profile.sex,
      targetWeightKg: profile.targetWeightKg,
      currentWeightKg: latestWeight?.value ?? null,
      previousWeightKg: prevWeight?.value ?? null,
    };
  }, [items, profile.sex, profile.targetWeightKg]);

  const onToggle = useCallback(
    (key: PrimaryKey) =>
      setMetrics((m) => {
        if (typeof m === "undefined") return [];

        if (m.includes(key)) return m.filter((k) => k !== key);
        return [...m, key];
      }),
    [setMetrics],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      setMetrics((m) => {
        const arr = m ?? [];
        const from = arr.indexOf(active.id as PrimaryKey);
        const to = arr.indexOf(over.id as PrimaryKey);
        if (from < 0 || to < 0) return arr;
        return arrayMove(arr, from, to);
      });
    },
    [setMetrics],
  );

  const toggle = useCallback(
    (key: PrimaryKey) => {
      setMetrics((prev) => {
        let next: PrimaryKey[];

        if (typeof prev === "undefined") return [key];
        else if (prev.includes(key)) {
          // Refuse to drop below 1 — an empty overview row reads as broken.
          if (prev.length <= 1) return prev;
          next = prev.filter((k) => k !== key);
        } else {
          next = [...prev, key];
        }

        return next;
      });
    },
    [setMetrics],
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between">
        <SectionHeader title="Panoramica" subtitle="Le tue metriche chiave a portata di mano." />

        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogTrigger className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors">
            <Edit className="h-4 w-4" aria-hidden />
            Modifica
          </DialogTrigger>
          <DialogContent className="sm:max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifica Layout</DialogTitle>
              <DialogDescription>Seleziona quali metriche ti interessano.</DialogDescription>
            </DialogHeader>

            {Object.entries(METRICS).map(([sezione, values]) => (
              <div key={sezione}>
                <label htmlFor={sezione} className="text-xl font-medium">
                  {sezione}
                </label>

                <ul id={sezione} className="divide-border/60 flex flex-col divide-y">
                  {Object.entries(values).map(([key, map]) => (
                    <li key={key} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{map.label}</p>
                        {map.unit && <p className="text-muted-foreground text-xs">{map.unit}</p>}
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="focus-ring border-input accent-primary h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-50"
                          checked={(metrics ?? []).includes(key as PrimaryKey)}
                          onChange={() => onToggle(key as PrimaryKey)}
                          aria-label={`Mostra ${map.label}`}
                        />
                        <span className="text-muted-foreground text-xs">
                          {(metrics ?? []).includes(key as PrimaryKey) ? "Visibile" : "Nascosto"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rings.map((r) => r.name)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {rings.map((r) => {
              const fieldName = r.name as PrimaryKey;
              const grade: MetricGrade | null =
                r.value != null ? gradeForHealthCard(fieldName, r.value, metricCtx, targets) : null;
              const overviewKey = FIELD_TO_OVERVIEW_KEY[fieldName];
              const editable = !!onCardClick && !!overviewKey && EDITOR_CONFIG[overviewKey] != null;
              const canRemove = metrics.length > 1;

              return (
                <SortableCard key={r.name} id={r.name}>
                  {canRemove && (
                    <button
                      type="button"
                      aria-label={`Rimuovi ${r.label}`}
                      title="Rimuovi dalla dashboard"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(r.key as PrimaryKey);
                      }}
                      className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive absolute top-1.5 right-7 z-10 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onCardClick!(overviewKey as OverviewMetricKey, r.label)}
                      aria-label={`Modifica ${r.label}`}
                      className="focus-ring hover:ring-primary/30 block size-full cursor-pointer rounded-xl text-left transition-all hover:ring-1 hover:brightness-[1.04] active:scale-[0.99]"
                    >
                      <MetricRingCard metric={r} grade={grade} />
                    </button>
                  ) : (
                    <MetricRingCard metric={r} grade={grade} />
                  )}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
