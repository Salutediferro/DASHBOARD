import type { Sex } from "@prisma/client";
import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";

/**
 * Traffic-light grading for biometric metrics.
 *
 *   `green`  → optimal / on target
 *   `yellow` → mediocre / making progress
 *   `red`    → outside healthy range / off target
 *
 * Two flavours:
 *   • Absolute   — value vs. medical/fitness reference range
 *                  (e.g. systolic BP 90–120 = green).
 *   • Relative   — value vs. the user's own target
 *                  (currently only weight, against `targetWeightKg`).
 *
 * Sources for the absolute bands:
 *   • Blood pressure: AHA/ESC adult guidelines.
 *   • Resting HR: ACSM normative tables (50–70 bpm "good").
 *   • SpO2: clinical "normal" ≥95–96 %.
 *   • Glucose: ADA fasting <100 normal, 100–125 prediabetes,
 *     ≥126 diabetic; postprandial <140 / 140–199 / ≥200.
 *   • Body temperature: WHO normothermic 36.0–37.5 °C.
 *   • Sleep: NSF adult recommendation 7–9 h.
 *   • Body-fat %: ACE classification by sex
 *     (athlete 6–13 ♂ / 14–20 ♀, average 18–24 / 25–31, obese ≥25 / ≥32).
 *   • Body water %: typical adult range 50–65 ♂ / 45–60 ♀.
 *   • Waist: WHO/IDF cut-offs for cardio-metabolic risk
 *     (♂ <94 ok / 94–101 inc / ≥102 high; ♀ <80 / 80–87 / ≥88).
 *   • Steps: 10 000/day rule of thumb; ≥5 000 = "low active".
 *   • Active minutes: WHO weekly 150 min ⇒ ~30 min/day target.
 *
 * Tweak in this one file as you collect real-world calibration.
 */

export type MetricGrade = "green" | "yellow" | "red";

export type MetricContext = {
  sex: Sex | null;
  targetWeightKg: number | null;
  /** Most recent weight reading. Required for the weight grade. */
  currentWeightKg?: number | null;
  /** Second-most-recent weight reading; lets weight grading consider
   *  trend (red if stable/wrong-direction, yellow if just progressing,
   *  green if close to target). */
  previousWeightKg?: number | null;
};

type MetricKey = keyof BiometricLogDTO;

type Band = {
  /** Closed interval treated as "green". */
  green: [number, number];
  /** Closed bottom edge of yellow. Defaults to greenLow (no low yellow). */
  yellowLow?: number;
  /** Closed top edge of yellow. Defaults to greenHigh (no high yellow). */
  yellowHigh?: number;
};

const ABS: Partial<Record<MetricKey, (ctx: MetricContext) => Band | null>> = {
  // Cardiovascular
  systolicBP: () => ({ green: [90, 120], yellowLow: 80, yellowHigh: 139 }),
  diastolicBP: () => ({ green: [60, 80], yellowLow: 50, yellowHigh: 89 }),
  restingHR: () => ({ green: [50, 70], yellowLow: 40, yellowHigh: 90 }),
  spo2: () => ({ green: [96, 100], yellowLow: 92 }),

  // Metabolic
  glucoseFasting: () => ({ green: [70, 99], yellowLow: 60, yellowHigh: 125 }),
  glucosePostMeal: () => ({ green: [70, 139], yellowHigh: 199 }),
  bodyTempC: () => ({ green: [36, 37.5], yellowLow: 35.5, yellowHigh: 38 }),

  // Sleep
  sleepHours: () => ({ green: [7, 9], yellowLow: 6, yellowHigh: 10 }),
  sleepQuality: () => ({ green: [8, 10], yellowLow: 6 }),
  sleepAwakenings: () => ({ green: [0, 1], yellowHigh: 3 }),

  // Activity
  steps: () => ({ green: [10_000, Number.POSITIVE_INFINITY], yellowLow: 5_000 }),
  activeMinutes: () => ({ green: [30, Number.POSITIVE_INFINITY], yellowLow: 15 }),

  // Body composition (sex-specific)
  bodyFatPercentage: (ctx) => {
    if (!ctx.sex) return null;
    return ctx.sex === "FEMALE"
      ? { green: [14, 20], yellowLow: 12, yellowHigh: 31 }
      : { green: [6, 13], yellowLow: 5, yellowHigh: 24 };
  },
  bodyWaterPct: (ctx) => {
    if (!ctx.sex) return null;
    return ctx.sex === "FEMALE"
      ? { green: [50, 60], yellowLow: 45, yellowHigh: 65 }
      : { green: [55, 65], yellowLow: 50, yellowHigh: 70 };
  },

  // Circumferences with cardio-metabolic cut-offs
  waistCm: (ctx) => {
    if (!ctx.sex) return null;
    return ctx.sex === "FEMALE"
      ? { green: [0, 80], yellowHigh: 87 }
      : { green: [0, 94], yellowHigh: 101 };
  },
};

function gradeAbsolute(band: Band, value: number): MetricGrade {
  const [gLo, gHi] = band.green;
  if (value >= gLo && value <= gHi) return "green";
  const yLo = band.yellowLow ?? gLo;
  const yHi = band.yellowHigh ?? gHi;
  if (value >= yLo && value <= yHi) return "yellow";
  return "red";
}

function gradeWeight(value: number, ctx: MetricContext): MetricGrade | null {
  if (ctx.targetWeightKg == null) return null;
  const target = ctx.targetWeightKg;
  if (target <= 0) return null;
  const distRel = Math.abs(value - target) / target;
  // Essentially at target — green regardless of trend.
  if (distRel <= 0.03) return "green";

  // No prior reading → fall back to distance bands.
  if (ctx.previousWeightKg == null) {
    if (distRel <= 0.10) return "yellow";
    return "red";
  }

  const goalIsLoss = value > target;
  const delta = value - ctx.previousWeightKg;
  // Tiny fluctuations count as "stable" — gym water swings, etc.
  const STABLE_KG = 0.3;
  if (Math.abs(delta) < STABLE_KG) return "red";
  const movingToward = goalIsLoss ? delta < 0 : delta > 0;
  if (!movingToward) return "red";
  // Progressing — green if within 7 % of target, yellow otherwise.
  return distRel <= 0.07 ? "green" : "yellow";
}

export function gradeMetric(
  key: MetricKey,
  value: number,
  ctx: MetricContext,
): MetricGrade | null {
  if (!Number.isFinite(value)) return null;
  if (key === "weight") return gradeWeight(value, ctx);
  const factory = ABS[key];
  if (!factory) return null;
  const band = factory(ctx);
  if (!band) return null;
  return gradeAbsolute(band, value);
}

export const METRIC_GRADE_LABELS: Record<MetricGrade, string> = {
  green: "Buono",
  yellow: "Attenzione",
  red: "Fuori range",
};

/** Latest non-null numeric reading for `key`, plus the date that came
 *  with it. Items are expected in DESC order (newest first). */
export function findLatestNumeric(
  items: BiometricLogDTO[],
  key: MetricKey,
): { value: number; date: string } | null {
  for (const r of items) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return { value: v, date: r.date };
    }
  }
  return null;
}

/** First non-null reading strictly older than `notDate`. Used to derive
 *  the "previous" weight passed into MetricContext for trend grading. */
export function findPreviousNumeric(
  items: BiometricLogDTO[],
  key: MetricKey,
  notDate: string,
): { value: number; date: string } | null {
  for (const r of items) {
    if (r.date >= notDate) continue;
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      return { value: v, date: r.date };
    }
  }
  return null;
}
