/**
 * Direction the metric "wants" to move relative to its target. Used by
 * the ring-progress fill on the health page and by the target-aware
 * chart gradient.
 *
 *   lower         → current ≤ target = full / green (e.g. body fat,
 *                   waist, resting HR — overshooting the target down
 *                   is still success)
 *   higher        → current ≥ target = full / green (e.g. muscle mass,
 *                   sleep quality, steps, SpO₂)
 *   bidirectional → distance from the target on either side reduces
 *                   the score (e.g. weight goal: at 60 kg with target
 *                   65 kg, the user has 5 kg to gain — not done yet)
 *   closeness     → tight band around the target; deviation in either
 *                   direction is bad (BP, body temperature, sleep
 *                   hours)
 */
export type MetricDirection = "lower" | "higher" | "bidirectional" | "closeness";

// Keyed by BiometricLog primary-key field names so consumers can
// resolve direction from the DTO without re-mapping. Skinfolds aren't
// listed — the SkinfoldsGrid grades them via a separate band table.
const DIRECTION: Record<string, MetricDirection> = {
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

export function directionForPrimary(key: string): MetricDirection {
  return DIRECTION[key] ?? "lower";
}
