"use client";

import Link from "next/link";
import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";
import { SectionHeader } from "../brand";
import { SortableCard } from "../sortable-card";
import { MetricRingCard, type RingMetric } from "./metric-ring-card";
import type { PatientProfile, PrimaryKey } from "./health-tabs";
import { useCallback, useMemo } from "react";
import { SlidersHorizontal, Trash2 } from "lucide-react";
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

// Direction the metric "wants" to move relative to its target.
//   lower         → current ≤ target = full ring (e.g. body fat: going
//                   below target is still success, not over-correction)
//   higher        → current ≥ target = full ring (e.g. muscle mass,
//                   steps, SpO₂)
//   bidirectional → distance-from-target on either side reduces the
//                   ring (e.g. weight goal: at 60 kg with target 65 kg
//                   the user has 5 kg to gain, ring should NOT be full)
//   closeness     → tight band around the target; deviation in either
//                   direction is bad (BP, body temperature, sleep
//                   hours)
type RingDirection = "lower" | "higher" | "bidirectional" | "closeness";

const DIRECTION: Record<string, RingDirection> = {
  weight: "bidirectional",
  bmi: "bidirectional",
  bodyFatPercentage: "lower",
  muscleMassKg: "higher",
  bodyWaterPct: "higher",
  waistCm: "lower",
  hipsCm: "bidirectional",
  chestCm: "bidirectional",
  armsCm: "bidirectional",
  thighCm: "bidirectional",
  calvesCm: "bidirectional",
  systolicBP: "closeness",
  diastolicBP: "closeness",
  restingHR: "lower",
  spo2: "higher",
  hrv: "higher",
  glucoseFasting: "lower",
  glucosePostMeal: "lower",
  ketones: "bidirectional",
  bodyTempC: "closeness",
  sleepHours: "closeness",
  sleepQuality: "higher",
  sleepAwakenings: "lower",
  steps: "higher",
  caloriesBurned: "higher",
  activeMinutes: "higher",
  distanceKm: "higher",
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function progressForRing(
  key: PrimaryKey,
  current: number | null,
  target: number | null,
): number {
  if (current == null || target == null || target === 0) return 0;
  const dir = DIRECTION[key] ?? "lower";
  switch (dir) {
    case "lower":
      return current <= target ? 1 : clamp01(target / current);
    case "higher":
      return current >= target ? 1 : clamp01(current / target);
    case "bidirectional":
      // Symmetric: smaller-of-the-two over larger. Approaching the
      // target from either side fills the ring; passing it doesn't
      // over-fill.
      return clamp01(Math.min(current, target) / Math.max(current, target));
    case "closeness": {
      // Within ±10% of target = full; degrades linearly to 0 at ±50%.
      const dev = Math.abs(current - target) / target;
      if (dev <= 0.1) return 1;
      if (dev >= 0.5) return 0;
      return clamp01(1 - (dev - 0.1) / 0.4);
    }
  }
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
      progress: progressForRing(key, value, target),
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
  /** Patient's tracked-metrics list (overview vocabulary). When given,
   * a ring is shown only if its biometric field maps to a tracked
   * metric — keeps the ring row consistent with the rest of the
   * filtering. Pass `null` (e.g. read-only professional view) to
   * disable the filter. */
  trackedMetrics?: ReadonlySet<string> | null;
  /** Callback invoked when the user clicks the trash button on a ring.
   * Should toggle (remove) the given overview-key from the patient's
   * server-backed selectedMetrics. When omitted (e.g. read-only view)
   * the trash button is hidden. */
  onUntrack?: (key: OverviewMetricKey) => void;
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

export function HealthRingRow({
  items,
  profile,
  targets,
  onCardClick,
  trackedMetrics,
  onUntrack,
}: HealthRingRowProps) {
  const [metrics, setMetrics] = useLocalStorageState<PrimaryKey[]>("tracked-metrics", {
    defaultValue: ["weight", "bmi", "waistCm", "bodyFatPercentage"],
  });

  // Intersect the user's locally-pinned ring list with the global
  // tracked-metrics selection — a ring whose underlying overview key
  // isn't tracked anywhere else shouldn't surface here either.
  const visibleMetrics = useMemo(() => {
    const list = metrics ?? [];
    if (!trackedMetrics) return list;
    return list.filter((k) => {
      const overviewKey = FIELD_TO_OVERVIEW_KEY[k];
      // Helper fields without an overview mapping (none in this set
      // today) would fall through; treat them as always visible.
      if (!overviewKey) return true;
      return trackedMetrics.has(overviewKey);
    });
  }, [metrics, trackedMetrics]);

  const rings = useMemo(
    () => computeRingMetrics(items, profile, visibleMetrics, targets),
    [items, profile, visibleMetrics, targets],
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

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between">
        <SectionHeader title="Panoramica" subtitle="Le tue metriche chiave a portata di mano." />

        <Link
          href="/dashboard/patient/profile#metriche"
          aria-label="Modifica metriche tracciate"
          className="focus-ring border-input bg-background text-muted-foreground hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Modifica metriche
        </Link>
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
              // Trash hides when there's nothing to remove (no overview
              // mapping, no callback, or only one ring left — emptying
              // the row reads as broken).
              const canUntrack =
                !!onUntrack && !!overviewKey && rings.length > 1;

              return (
                <SortableCard key={r.name} id={r.name}>
                  {canUntrack && (
                    <button
                      type="button"
                      aria-label={`Smetti di tracciare ${r.label}`}
                      title={`Smetti di tracciare ${r.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUntrack!(overviewKey as OverviewMetricKey);
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
