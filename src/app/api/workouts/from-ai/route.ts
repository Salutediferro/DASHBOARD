import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftTemplate,
  saveTemplate,
  type Difficulty,
  type WorkoutType,
  type WorkoutTemplate,
  type WorkoutDayItem,
} from "@/lib/mock-workouts";
import { aiProgramSchema } from "@/lib/validators/ai-program";
import { z } from "zod";

// TODO: remove dev bypass
function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const DEV_USER = { id: "dev-bypass" } as const;

async function requireCoach(req: Request) {
  if (isDevBypass(req)) return DEV_USER;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);
  if (role !== "COACH" && role !== "ADMIN") return null;
  return user;
}

const GOAL_TO_TYPE: Record<string, WorkoutType> = {
  HYPERTROPHY: "HYPERTROPHY",
  STRENGTH: "STRENGTH",
  POWERLIFTING: "POWERLIFTING",
  FAT_LOSS: "CONDITIONING",
  RECOMP: "HYPERTROPHY",
  ATHLETIC: "CONDITIONING",
};

const LEVEL_TO_DIFFICULTY: Record<string, Difficulty> = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  ELITE: "EXPERT",
};

const bodySchema = z.object({
  program: aiProgramSchema,
  goal: z.string().optional(),
  level: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireCoach(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { program, goal, level } = parsed.data;

  const draft = createDraftTemplate();
  const type: WorkoutType = goal ? GOAL_TO_TYPE[goal] ?? "CUSTOM" : "HYPERTROPHY";
  const difficulty: Difficulty = level
    ? LEVEL_TO_DIFFICULTY[level] ?? "INTERMEDIATE"
    : "INTERMEDIATE";

  const days: WorkoutDayItem[] = program.days.map((d, di) => ({
    id: `d-${draft.id}-${di}`,
    name: d.name,
    notes: d.notes ?? null,
    exercises: d.exercises.map((e, ei) => ({
      id: `we-${draft.id}-${di}-${ei}`,
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      orderIndex: ei,
      sets: e.sets,
      reps: e.reps,
      rpe: e.rpe ?? null,
      tempo: null,
      restSeconds: e.restSeconds ?? null,
      notes: e.notes ?? null,
      supersetGroup: e.supersetGroup ?? null,
    })),
  }));

  const full: WorkoutTemplate = {
    ...draft,
    name: program.name,
    description: program.description,
    type,
    difficulty,
    tags: ["ai-generated"],
    days,
  };
  const saved = saveTemplate(full);
  return NextResponse.json(saved, { status: 201 });
}
