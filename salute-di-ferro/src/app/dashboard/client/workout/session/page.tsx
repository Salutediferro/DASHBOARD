"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
  Plus,
  StickyNote,
  Trash2,
  Trophy,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RestTimer } from "@/components/workout/rest-timer";
import type { TodayWorkout } from "@/lib/mock-client-workout";

type SetState = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completed: boolean;
  notes: string | null;
  previousWeight: number | null;
  previousReps: number | null;
};

type ExerciseState = {
  id: string;
  name: string;
  notes: string | null;
  restSeconds: number;
  supersetGroup: string | null;
  sets: SetState[];
};

type SessionState = {
  sessionId: string;
  templateName: string;
  dayName: string;
  startedAt: number;
  exercises: ExerciseState[];
  completed: boolean;
  rating: number | null;
  generalNotes: string;
};

const STORAGE_KEY = "sdf-active-session";

function toExerciseState(w: TodayWorkout): ExerciseState[] {
  return w.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    notes: e.notes,
    restSeconds: e.restSeconds,
    supersetGroup: e.supersetGroup,
    sets: e.sets.map((s) => ({
      setNumber: s.setNumber,
      weight: null,
      reps: null,
      rpe: null,
      isWarmup: s.isWarmup,
      completed: false,
      notes: null,
      previousWeight: s.previousWeight,
      previousReps: s.previousReps,
    })),
  }));
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function totalVolume(exs: ExerciseState[]) {
  return exs.reduce(
    (acc, e) =>
      acc +
      e.sets.reduce((a, s) => {
        if (!s.completed || s.isWarmup) return a;
        return a + (s.weight ?? 0) * (s.reps ?? 0);
      }, 0),
    0,
  );
}

function completedCount(exs: ExerciseState[]) {
  return exs.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0,
  );
}

// Persistence ---------------------------------------------------------------

function loadSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

function saveSession(s: SessionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "text-3xl transition-transform hover:scale-110",
            (value ?? 0) >= n ? "text-primary" : "text-muted",
          )}
          aria-label={`${n} stelle`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type ExerciseCardProps = {
  exercise: ExerciseState;
  onChange: (patch: Partial<ExerciseState>) => void;
  onSetComplete: (setNumber: number, restSeconds: number) => void;
};

function ExerciseSessionCard({
  exercise,
  onChange,
  onSetComplete,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = React.useState(true);
  const done = exercise.sets.every((s) => s.completed);
  const supersetColor = exercise.supersetGroup ? "#c9a96e" : null;

  function updateSet(i: number, patch: Partial<SetState>) {
    const sets = exercise.sets.slice();
    sets[i] = { ...sets[i]!, ...patch };
    onChange({ sets });
  }

  function toggleSetComplete(i: number) {
    const s = exercise.sets[i]!;
    const willComplete = !s.completed;
    const weight = s.weight ?? s.previousWeight;
    const reps = s.reps ?? s.previousReps;
    updateSet(i, {
      completed: willComplete,
      weight: willComplete ? weight : s.weight,
      reps: willComplete ? reps : s.reps,
    });
    if (willComplete) {
      if ("vibrate" in navigator) navigator.vibrate(50);
      onSetComplete(s.setNumber, exercise.restSeconds);
    }
  }

  function addExtraSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({
      sets: [
        ...exercise.sets,
        {
          setNumber: (last?.setNumber ?? 0) + 1,
          weight: null,
          reps: null,
          rpe: null,
          isWarmup: false,
          completed: false,
          notes: null,
          previousWeight: last?.previousWeight ?? null,
          previousReps: last?.previousReps ?? null,
        },
      ],
    });
  }

  function removeSet(i: number) {
    onChange({ sets: exercise.sets.filter((_, idx) => idx !== i) });
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        done && "border-primary/60 bg-primary/5",
      )}
    >
      {supersetColor && (
        <span
          className="absolute top-0 bottom-0 left-0 w-1.5"
          style={{ background: supersetColor }}
          aria-hidden
        />
      )}
      <CardContent className="flex flex-col gap-4 p-4 pl-5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-start gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-semibold tracking-tight">
                {exercise.name}
              </h3>
              {done && <CheckCircle2 className="text-primary h-5 w-5" />}
              {exercise.supersetGroup && (
                <Badge className="bg-primary/20 text-primary text-[10px]">
                  Superset
                </Badge>
              )}
            </div>
            {exercise.notes && (
              <p className="text-muted-foreground mt-1 flex items-start gap-1 text-xs">
                <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                {exercise.notes}
              </p>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="text-muted-foreground h-5 w-5" />
          ) : (
            <ChevronDown className="text-muted-foreground h-5 w-5" />
          )}
        </button>

        {expanded && (
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground grid grid-cols-[32px_1fr_1fr_1fr_48px] items-center gap-2 px-1 text-[10px] uppercase tracking-wider">
              <span>Set</span>
              <span>Peso (kg)</span>
              <span>Reps</span>
              <span>RPE</span>
              <span></span>
            </div>

            {exercise.sets.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[32px_1fr_1fr_1fr_48px] items-center gap-2 rounded-md p-1.5 transition-colors",
                  s.completed && "bg-primary/10",
                  s.isWarmup && !s.completed && "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "text-center text-sm font-semibold tabular-nums",
                    s.isWarmup && "text-yellow-400",
                  )}
                >
                  {s.isWarmup ? "W" : s.setNumber}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder={s.previousWeight?.toString() ?? "—"}
                  value={s.weight ?? ""}
                  onChange={(e) =>
                    updateSet(i, {
                      weight: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-14 text-center text-2xl font-semibold tabular-nums"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={s.previousReps?.toString() ?? "—"}
                  value={s.reps ?? ""}
                  onChange={(e) =>
                    updateSet(i, {
                      reps: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-14 text-center text-2xl font-semibold tabular-nums"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="—"
                  value={s.rpe ?? ""}
                  onChange={(e) =>
                    updateSet(i, {
                      rpe: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-14 text-center text-lg font-semibold tabular-nums"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSetComplete(i)}
                    aria-label="Completa set"
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-md transition-colors",
                      s.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80",
                    )}
                  >
                    <Check className="h-6 w-6" />
                  </button>
                </div>
                <div className="col-span-5 flex items-center justify-between pl-1 pt-1">
                  <label className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px]">
                    <input
                      type="checkbox"
                      checked={s.isWarmup}
                      onChange={(e) =>
                        updateSet(i, { isWarmup: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    Warmup
                  </label>
                  {exercise.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(i)}
                      className="text-muted-foreground hover:text-destructive flex h-6 items-center gap-1 text-[10px]"
                    >
                      <Trash2 className="h-3 w-3" />
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addExtraSet}
              className="text-muted-foreground hover:bg-muted mt-1 flex h-12 items-center justify-center gap-1 rounded-md border border-dashed text-sm"
            >
              <Plus className="h-4 w-4" />
              Aggiungi set
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkoutSessionPage() {
  const router = useRouter();
  const [session, setSession] = React.useState<SessionState | null>(null);
  const [restSeconds, setRestSeconds] = React.useState<number | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  // Load initial: resume or fetch today
  const { data, isLoading } = useQuery<TodayWorkout>({
    queryKey: ["client-workout-today"],
    queryFn: async () => {
      const res = await fetch("/api/client/workout/today");
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: session === null,
  });

  React.useEffect(() => {
    const stored = loadSession();
    if (stored && !stored.completed) {
      setSession(stored);
      toast.success("Sessione ripresa");
      return;
    }
    if (data && !session) {
      const fresh: SessionState = {
        sessionId: data.sessionId,
        templateName: data.templateName,
        dayName: data.dayName,
        startedAt: Date.now(),
        exercises: toExerciseState(data),
        completed: false,
        rating: null,
        generalNotes: "",
      };
      setSession(fresh);
      saveSession(fresh);
    }
  }, [data, session]);

  // Total session timer
  React.useEffect(() => {
    if (!session || session.completed) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  // Auto-save on any change
  React.useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  function updateExercise(index: number, patch: Partial<ExerciseState>) {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.slice();
      const updated: ExerciseState = { ...exercises[index]!, ...patch };
      exercises[index] = updated;
      return { ...prev, exercises };
    });
  }

  function handleSetComplete(
    exerciseId: string,
    setNumber: number,
    rest: number,
  ) {
    setRestSeconds(rest);
    // Fire-and-forget save of this set
    fetch("/api/client/workout/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session?.sessionId,
        exerciseId,
        setNumber,
        weight: 0,
        reps: 0,
        rpe: null,
        isWarmup: false,
        completed: true,
      }),
    }).catch(() => {});
  }

  async function completeSession() {
    if (!session) return;
    const durationMin = Math.round(elapsed / 60);
    const volume = totalVolume(session.exercises);
    const next: SessionState = { ...session, completed: true };
    setSession(next);
    saveSession(next);

    await fetch("/api/client/workout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        durationMin,
        rating: session.rating,
        notes: session.generalNotes || null,
        totalVolumeKg: volume,
      }),
    }).catch(() => {});
  }

  function exitSession() {
    clearSession();
    router.replace("/dashboard/client/workout");
  }

  if (isLoading || !session) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (session.completed) {
    const volume = totalVolume(session.exercises);
    const sets = completedCount(session.exercises);
    return (
      <div className="animate-in fade-in-0 flex flex-col gap-6 duration-500">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
            <Trophy className="text-primary h-10 w-10" />
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Sessione completata
          </h1>
          <p className="text-muted-foreground">Ottimo lavoro!</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-muted-foreground text-xs">Durata</span>
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {formatDuration(elapsed)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-muted-foreground text-xs">Volume</span>
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {Math.round(volume)} kg
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-muted-foreground text-xs">Set</span>
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {sets}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <p className="text-sm font-medium">Come è andata?</p>
            <StarRating
              value={session.rating}
              onChange={(v) => setSession({ ...session, rating: v })}
            />
            <Textarea
              placeholder="Note generali..."
              value={session.generalNotes}
              onChange={(e) =>
                setSession({ ...session, generalNotes: e.target.value })
              }
              rows={3}
              className="w-full"
            />
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={exitSession}
          className="bg-primary text-primary-foreground flex h-14 items-center justify-center rounded-lg text-lg font-semibold"
        >
          Fine
        </button>
      </div>
    );
  }

  const completedSets = completedCount(session.exercises);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <div className="flex flex-col gap-4 pb-32">
      {/* Header */}
      <header className="bg-background/95 sticky top-0 z-20 -mx-4 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {session.templateName}
          </p>
          <h1 className="font-heading truncate text-lg font-semibold">
            {session.dayName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Flame className="text-primary h-4 w-4" />
            <span className="font-heading text-xl font-semibold tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Terminare la sessione?")) completeSession();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-3 text-sm font-semibold"
          >
            Termina
          </button>
        </div>
      </header>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {completedSets} / {totalSets} set completati
        </span>
        <div className="bg-muted mx-3 h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {session.exercises.map((e, i) => (
        <ExerciseSessionCard
          key={e.id}
          exercise={e}
          onChange={(p) => updateExercise(i, p)}
          onSetComplete={(setNumber, rest) =>
            handleSetComplete(e.id, setNumber, rest)
          }
        />
      ))}

      {restSeconds !== null && (
        <RestTimer
          key={restSeconds + "-" + Date.now()}
          seconds={restSeconds}
          onComplete={() => {
            /* stays visible until dismissed */
          }}
          onDismiss={() => setRestSeconds(null)}
        />
      )}
    </div>
  );
}
