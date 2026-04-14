import { ProgressionAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * RP Strength-inspired progression logic.
 *
 * Weight decision (per set history):
 *  - All reps completed AND RPE < target-0.5  → INCREASE_WEIGHT by exercise.incrementKg
 *  - All reps completed AND RPE within target → MAINTAIN (or ADD_SET if weekly volume target not hit)
 *  - Reps missed (<min) OR RPE > target+1     → REDUCE_WEIGHT by one increment
 *
 * Volume: add 1 set per exercise every 1–2 weeks up to maxSets.
 * Deload: every 4–6 weeks reduce volume by 40% (maintain intensity).
 */

export type SetHistoryPoint = {
  date: Date;
  weight: number;
  reps: number;
  rpe: number | null;
};

export type ProgressionSuggestion = {
  exerciseId: string;
  action: ProgressionAction;
  reason: string;
  lastWeight: number;
  lastReps: number;
  lastRpe: number | null;
  suggestedWeight: number;
  suggestedReps: number;
  suggestedSets: number | null;
};

export type CalcInput = {
  history: SetHistoryPoint[];
  targetReps: number;
  targetRpe: number;
  incrementKg: number;
};

export function calculateNextWeight(input: CalcInput): {
  action: ProgressionAction;
  weight: number;
  reason: string;
} {
  const { history, targetReps, targetRpe, incrementKg } = input;
  if (history.length === 0) {
    return { action: "MAINTAIN", weight: 0, reason: "Nessuno storico disponibile" };
  }

  // Use the most recent working set as reference.
  const last = history[history.length - 1];
  const rpe = last.rpe ?? targetRpe;

  if (last.reps >= targetReps && rpe <= targetRpe - 0.5) {
    return {
      action: "INCREASE_WEIGHT",
      weight: last.weight + incrementKg,
      reason: `${last.reps}×${last.weight}kg @ RPE ${rpe} — margine sopra target`,
    };
  }
  if (last.reps < targetReps - 2 || rpe > targetRpe + 1) {
    return {
      action: "REDUCE_WEIGHT",
      weight: Math.max(0, last.weight - incrementKg),
      reason: `${last.reps}×${last.weight}kg @ RPE ${rpe} — sotto target, ridurre`,
    };
  }
  return {
    action: "MAINTAIN",
    weight: last.weight,
    reason: `${last.reps}×${last.weight}kg @ RPE ${rpe} — mantenere`,
  };
}

export function shouldAddSet(
  weekNumber: number,
  currentSets: number,
  maxSets: number,
): boolean {
  if (currentSets >= maxSets) return false;
  // Add a set every 2 weeks.
  return weekNumber > 1 && weekNumber % 2 === 0;
}

export function isDeloadWeek(weekNumber: number, mesocycleLength = 5): boolean {
  if (mesocycleLength < 4 || mesocycleLength > 6) {
    return weekNumber % 5 === 0;
  }
  return weekNumber === mesocycleLength;
}

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Generate suggestions for every exercise the client has recent history on.
 * Compares the last session to the previous one to decide the progression.
 */
export async function generateProgressionSuggestions(
  clientId: string,
  coachId: string,
): Promise<ProgressionSuggestion[]> {
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

  // Pull recent set logs grouped by exercise.
  const sets = await prisma.workoutSetLog.findMany({
    where: {
      workoutLog: { clientId, date: { gte: since } },
      isWarmup: false,
    },
    include: {
      workoutLog: { select: { date: true } },
      exercise: {
        select: { id: true, nameIt: true, incrementKg: true },
      },
    },
    orderBy: { workoutLog: { date: "asc" } },
  });

  if (sets.length === 0) return [];

  // Group by exerciseId.
  const byExercise = new Map<
    string,
    {
      exerciseId: string;
      incrementKg: number;
      history: SetHistoryPoint[];
    }
  >();
  for (const s of sets) {
    let entry = byExercise.get(s.exerciseId);
    if (!entry) {
      entry = {
        exerciseId: s.exerciseId,
        incrementKg: s.exercise.incrementKg,
        history: [],
      };
      byExercise.set(s.exerciseId, entry);
    }
    entry.history.push({
      date: s.workoutLog.date,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
    });
  }

  // Assume targets (we don't track per-set target reps/rpe yet).
  const TARGET_REPS = 8;
  const TARGET_RPE = 8;

  const suggestions: ProgressionSuggestion[] = [];
  for (const entry of byExercise.values()) {
    if (entry.history.length < 2) continue;
    const last = entry.history[entry.history.length - 1];
    const calc = calculateNextWeight({
      history: entry.history,
      targetReps: TARGET_REPS,
      targetRpe: TARGET_RPE,
      incrementKg: entry.incrementKg,
    });
    suggestions.push({
      exerciseId: entry.exerciseId,
      action: calc.action,
      reason: calc.reason,
      lastWeight: last.weight,
      lastReps: last.reps,
      lastRpe: last.rpe,
      suggestedWeight: calc.weight,
      suggestedReps: TARGET_REPS,
      suggestedSets: null,
    });
  }
  return suggestions;
}

/**
 * Upserts suggestions for a client. Existing PENDING suggestions for the same
 * (clientId, exerciseId) pair are replaced with the new computation.
 */
export async function upsertProgressionSuggestions(
  clientId: string,
  coachId: string,
): Promise<number> {
  const suggestions = await generateProgressionSuggestions(clientId, coachId);
  if (suggestions.length === 0) return 0;

  // Clear previous PENDING rows for this client to avoid stale entries.
  await prisma.progressionSuggestion.deleteMany({
    where: { clientId, status: "PENDING" },
  });

  await prisma.progressionSuggestion.createMany({
    data: suggestions.map((s) => ({
      clientId,
      coachId,
      exerciseId: s.exerciseId,
      status: "PENDING",
      action: s.action,
      reason: s.reason,
      lastWeight: s.lastWeight,
      lastReps: s.lastReps,
      lastRpe: s.lastRpe,
      suggestedWeight: s.suggestedWeight,
      suggestedReps: s.suggestedReps,
      suggestedSets: s.suggestedSets,
    })),
  });
  return suggestions.length;
}

/**
 * 1RM history for a given exercise, grouped by workout session (max e1RM per day).
 */
export async function fetchOneRepMaxHistory(
  clientId: string,
  exerciseSlug: string,
  days = 90,
): Promise<Array<{ date: string; e1rm: number }>> {
  const exercise = await prisma.exercise.findUnique({
    where: { slug: exerciseSlug },
    select: { id: true },
  });
  if (!exercise) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sets = await prisma.workoutSetLog.findMany({
    where: {
      exerciseId: exercise.id,
      isWarmup: false,
      workoutLog: { clientId, date: { gte: since } },
    },
    include: { workoutLog: { select: { date: true } } },
    orderBy: { workoutLog: { date: "asc" } },
  });

  const byDay = new Map<string, number>();
  for (const s of sets) {
    const key = s.workoutLog.date.toISOString().slice(0, 10);
    const e = epley1RM(s.weight, s.reps);
    const prev = byDay.get(key) ?? 0;
    if (e > prev) byDay.set(key, e);
  }
  return Array.from(byDay.entries())
    .map(([date, e1rm]) => ({ date, e1rm: Math.round(e1rm * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
