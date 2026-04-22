import type { BiometricLogDTO } from "@/lib/hooks/use-biometrics";

/**
 * Sleep wellness score.
 *
 * We combine three user-logged signals into a single 0-10 score so the
 * patient gets a quick read on whether their sleep is "OK" or "talk to
 * the coach". Weights and targets are intentionally conservative —
 * this is user-facing guidance, not a clinical assessment. Any change
 * to the formula should be reviewed together (AT-2 feedback).
 *
 *  - hours (weight 0.50): 7-9h = full marks; linear decay outside.
 *  - quality 1-10 (weight 0.35): patient's own self-rating, trusted
 *    as-is because it captures subjective recovery that hours alone
 *    miss.
 *  - awakenings (weight 0.15): 0-1 = full; each extra awakening
 *    costs roughly a point, capped at 0.
 *
 * Returns null when there's not enough signal to compute something
 * meaningful (neither hours nor a quality rating). We intentionally do
 * NOT return a partial score from a single dimension because a lonely
 * "hours=6" row would otherwise masquerade as a full score.
 */
export function computeSleepScore(log: {
  sleepHours: number | null;
  sleepQuality: number | null;
  sleepAwakenings: number | null;
}): number | null {
  const { sleepHours, sleepQuality, sleepAwakenings } = log;
  const haveHours = typeof sleepHours === "number" && sleepHours > 0;
  const haveQuality =
    typeof sleepQuality === "number" && sleepQuality >= 1 && sleepQuality <= 10;

  if (!haveHours && !haveQuality) return null;

  // Collect (value, weight) pairs and normalize weights at the end so
  // a missing dimension just redistributes weight to the remaining ones
  // instead of collapsing the score.
  const parts: Array<{ score: number; weight: number }> = [];

  if (haveHours) {
    parts.push({ score: hoursScore(sleepHours!), weight: 0.5 });
  }
  if (haveQuality) {
    parts.push({ score: sleepQuality!, weight: 0.35 });
  }
  if (typeof sleepAwakenings === "number" && sleepAwakenings >= 0) {
    parts.push({ score: awakeningsScore(sleepAwakenings), weight: 0.15 });
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = parts.reduce((s, p) => s + p.score * p.weight, 0);
  return round1(weighted / totalWeight);
}

function hoursScore(h: number): number {
  // Sweet spot 7-9 → 10. Each hour away loses ~2 points.
  if (h >= 7 && h <= 9) return 10;
  if (h < 7) return clamp10(10 - (7 - h) * 2);
  return clamp10(10 - (h - 9) * 2);
}

function awakeningsScore(n: number): number {
  // 0-1 awakenings → full marks, then roughly -1 per awakening.
  if (n <= 1) return 10;
  return clamp10(10 - (n - 1));
}

function clamp10(n: number): number {
  if (n < 0) return 0;
  if (n > 10) return 10;
  return n;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type SleepScoreSummary = {
  avg: number | null;
  count: number;
  windowDays: number;
  latest: number | null;
  /** Traffic-light bucket so the UI doesn't have to duplicate thresholds. */
  band: "good" | "ok" | "low" | null;
};

/**
 * Rolling average over the last `windowDays` days, using only logs that
 * yield a non-null score. Returns band buckets:
 *   - good  ≥ 7
 *   - ok    5..7
 *   - low   < 5  → coach suggestion fires
 */
export function summarizeSleep(
  logs: Array<
    Pick<
      BiometricLogDTO,
      "date" | "sleepHours" | "sleepQuality" | "sleepAwakenings"
    >
  >,
  windowDays = 14,
  now: Date = new Date(),
): SleepScoreSummary {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const scored: Array<{ date: string; score: number }> = [];
  for (const log of logs) {
    const t = new Date(log.date).getTime();
    if (!Number.isFinite(t) || t < cutoff) continue;
    const s = computeSleepScore(log);
    if (s != null) scored.push({ date: log.date, score: s });
  }
  if (scored.length === 0) {
    return { avg: null, count: 0, windowDays, latest: null, band: null };
  }
  const sum = scored.reduce((a, b) => a + b.score, 0);
  const avg = round1(sum / scored.length);
  // logs come in DESC order from the API, so first scored = newest.
  const latest = scored[0].score;
  return {
    avg,
    count: scored.length,
    windowDays,
    latest,
    band: avg >= 7 ? "good" : avg >= 5 ? "ok" : "low",
  };
}
