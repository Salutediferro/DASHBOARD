import {
  gradeMetric,
  type MetricContext,
  type MetricGrade,
} from "@/lib/health/metric-thresholds";
import {
  FIELD_TO_OVERVIEW_KEY,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";
import type { MetricTargetsMap } from "@/lib/hooks/use-metric-targets";

/**
 * Visual treatment for the three grades. Same palette as the health
 * page (`health-tabs.tsx` GRADE_TONE) so the patient sees consistent
 * colours between dashboard and `/dashboard/patient/health`.
 */
export const GRADE_TONE: Record<MetricGrade, string> = {
  green: "ring-1 ring-emerald-500/70 bg-emerald-500/[0.18]",
  yellow: "ring-1 ring-amber-500/70 bg-amber-500/[0.18]",
  // Switched from rose-500 (pinkish) to red-500 — same hue family as the
  // app's `--destructive` token. Pushed higher than the other two so a
  // red card unmistakably reads as "out of range" at a glance.
  red: "ring-1 ring-red-500/85 bg-red-500/[0.22]",
};

/**
 * Per-overview-card directional preference for target-based grading:
 *  - `lower-better`  → green when value ≤ target (e.g. weight, BP, body fat)
 *  - `higher-better` → green when value ≥ target (e.g. steps, sleep hours)
 *  - `neutral`       → green when |value - target| is small (e.g. BMI, body temp)
 *
 * Stays in sync with the `invertDelta` flag on the overview registry
 * but expresses the intent more precisely (the registry only has 2
 * states; this has 3).
 */
export type MetricDirection = "lower-better" | "higher-better" | "neutral";

export const METRIC_DIRECTION: Record<OverviewMetricKey, MetricDirection> = {
  // Generale
  weight: "lower-better",
  weightDelta: "lower-better",
  bmi: "neutral",
  checkIns: "higher-better",
  nextAppointment: "neutral",
  // Composizione
  bodyFat: "lower-better",
  muscleMass: "higher-better",
  bodyWater: "neutral",
  // Circonferenze
  waist: "lower-better",
  hips: "lower-better",
  chest: "neutral",
  arms: "neutral",
  thigh: "neutral",
  calves: "neutral",
  // Cardio
  bloodPressure: "lower-better",
  restingHR: "lower-better",
  spo2: "higher-better",
  hrv: "higher-better",
  // Metabolico
  glucoseFasting: "lower-better",
  glucosePostMeal: "lower-better",
  bodyTempC: "neutral",
  ketones: "neutral",
  // Sonno
  sleepHours: "neutral",
  sleepQuality: "higher-better",
  sleepAwakenings: "lower-better",
  // Attività
  steps: "higher-better",
  caloriesBurned: "higher-better",
  activeMinutes: "higher-better",
  distanceKm: "higher-better",
  // Benessere
  mood: "higher-better",
  energy: "higher-better",
  energyLevel: "higher-better",
};

// Map overview-card keys to the BiometricLog field names that the
// existing absolute-band engine knows about. Cards without a matching
// field (composite or symptom-sourced) return null and skip the band.
const ABSOLUTE_BAND_KEY: Partial<Record<OverviewMetricKey, keyof BiometricLogDTO>> = {
  weight: "weight",
  bodyFat: "bodyFatPercentage",
  bodyWater: "bodyWaterPct",
  waist: "waistCm",
  restingHR: "restingHR",
  spo2: "spo2",
  glucoseFasting: "glucoseFasting",
  glucosePostMeal: "glucosePostMeal",
  bodyTempC: "bodyTempC",
  sleepHours: "sleepHours",
  sleepQuality: "sleepQuality",
  sleepAwakenings: "sleepAwakenings",
  steps: "steps",
  activeMinutes: "activeMinutes",
};

/**
 * Distance-to-target grade. Tolerance bands match the spirit of the
 * existing weight grading (≤3 % == essentially-on-target green) but
 * applied symmetrically or directionally per the metric's preference.
 */
export function gradeByTarget(
  value: number,
  target: number,
  direction: MetricDirection,
): MetricGrade {
  if (target <= 0 || !Number.isFinite(target)) return "yellow";
  const diffPct = (value - target) / Math.abs(target);
  switch (direction) {
    case "lower-better":
      // Below or at target → all good. Above target tolerated up to 20 %.
      if (diffPct <= 0.05) return "green";
      if (diffPct <= 0.2) return "yellow";
      return "red";
    case "higher-better":
      if (diffPct >= -0.05) return "green";
      if (diffPct >= -0.2) return "yellow";
      return "red";
    case "neutral": {
      const abs = Math.abs(diffPct);
      if (abs <= 0.05) return "green";
      if (abs <= 0.2) return "yellow";
      return "red";
    }
  }
}

/**
 * Grading sequence used by the overview cards:
 *   1. If the user has set a personal target → grade by distance to target.
 *   2. Else if the metric has a medical/fitness band → use `gradeMetric`.
 *   3. Else null (card renders neutrally).
 */
export function gradeOverviewMetric(
  key: OverviewMetricKey,
  value: number,
  ctx: MetricContext & { userTarget?: number | null },
): MetricGrade | null {
  if (!Number.isFinite(value)) return null;

  if (ctx.userTarget != null && Number.isFinite(ctx.userTarget)) {
    return gradeByTarget(value, ctx.userTarget, METRIC_DIRECTION[key]);
  }

  const bandKey = ABSOLUTE_BAND_KEY[key];
  if (!bandKey) return null;
  return gradeMetric(bandKey, value, ctx);
}

/**
 * BMI bands match the chip in BMICard (WHO adult cut-offs):
 *   green: 18.5 ≤ bmi < 25
 *   yellow: 16 ≤ bmi < 18.5 OR 25 ≤ bmi < 30
 *   red: bmi < 16 OR bmi ≥ 30
 *
 * Personal target (if set) overrides with neutral distance grading.
 */
export function gradeBmi(value: number, userTarget?: number | null): MetricGrade | null {
  if (!Number.isFinite(value)) return null;
  if (userTarget != null && Number.isFinite(userTarget)) {
    return gradeByTarget(value, userTarget, "neutral");
  }
  if (value >= 18.5 && value < 25) return "green";
  if (value >= 16 && value < 30) return "yellow";
  return "red";
}

const GRADE_RANK: Record<MetricGrade, number> = { green: 0, yellow: 1, red: 2 };
function worse(a: MetricGrade | null, b: MetricGrade | null): MetricGrade | null {
  if (a == null) return b;
  if (b == null) return a;
  return GRADE_RANK[a] >= GRADE_RANK[b] ? a : b;
}

/**
 * Composite grade for blood pressure. Shows the worst of (systolic,
 * diastolic) since one alone being out of range is enough to flag the
 * reading. Mirrors how a clinician would read "120/95": the high
 * diastolic dominates.
 */
export function gradeBloodPressure(
  sys: number | null,
  dia: number | null,
  ctx: MetricContext,
  target?: { systolic: number; diastolic: number } | null,
): MetricGrade | null {
  if (target) {
    const sg = sys != null ? gradeByTarget(sys, target.systolic, "lower-better") : null;
    const dg = dia != null ? gradeByTarget(dia, target.diastolic, "lower-better") : null;
    return worse(sg, dg);
  }
  const sg = sys != null ? gradeMetric("systolicBP", sys, ctx) : null;
  const dg = dia != null ? gradeMetric("diastolicBP", dia, ctx) : null;
  return worse(sg, dg);
}

/**
 * Health-page card grade keyed by the BiometricLog field name (e.g.
 * `weight`, `waistCm`, `systolicBP`). Prefers the user's personal
 * target, falls back to the absolute medical band.
 *
 * Special-cases blood pressure: the health page has separate sys/dia
 * cards but the target lives under the composite "bloodPressure" key,
 * so we read each side from the composite.
 */
export function gradeForHealthCard(
  fieldName: string,
  value: number,
  ctx: MetricContext,
  targets: MetricTargetsMap,
): MetricGrade | null {
  if (fieldName === "systolicBP" || fieldName === "diastolicBP") {
    const t = targets.bloodPressure;
    if (t && typeof t === "object") {
      const target = fieldName === "systolicBP" ? t.systolic : t.diastolic;
      return gradeByTarget(value, target, "lower-better");
    }
    return gradeMetric(fieldName as keyof BiometricLogDTO, value, ctx);
  }
  const overviewKey = FIELD_TO_OVERVIEW_KEY[fieldName];
  if (!overviewKey) {
    return gradeMetric(fieldName as keyof BiometricLogDTO, value, ctx);
  }
  const t = targets[overviewKey];
  if (overviewKey === "bmi") {
    return gradeBmi(value, typeof t === "number" ? t : null);
  }
  return gradeOverviewMetric(overviewKey, value, {
    ...ctx,
    userTarget: typeof t === "number" ? t : null,
  });
}

/**
 * Resolve the effective target value for a card, picking the user's
 * server-side target first and falling back to a sensible default.
 * Used both for the ring's progress arc and for the displayed sub-label.
 *
 * Composite metrics (BP) aren't supported here — call sites that need
 * the BP target should read it directly from `targets.bloodPressure`.
 */
export function effectiveTargetFor(
  fieldName: string,
  fallback: number | null,
  targets: MetricTargetsMap,
): number | null {
  const overviewKey = FIELD_TO_OVERVIEW_KEY[fieldName];
  if (!overviewKey) return fallback;
  const t = targets[overviewKey];
  if (typeof t === "number") return t;
  return fallback;
}
