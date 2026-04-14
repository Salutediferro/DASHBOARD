import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const logSetSchema = z.object({
  sessionId: z.string(),
  exerciseId: z.string(),
  setNumber: z.number().int().min(1),
  weight: z.number().nullable(),
  reps: z.number().nullable(),
  rpe: z.number().nullable(),
  isWarmup: z.boolean(),
  completed: z.boolean(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = logSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  // TODO: upsert into WorkoutLog + WorkoutSetLog
  return NextResponse.json({ saved: true });
}
