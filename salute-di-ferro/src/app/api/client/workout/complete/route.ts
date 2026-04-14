import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const completeSchema = z.object({
  sessionId: z.string(),
  durationMin: z.number().int().min(0),
  rating: z.number().int().min(1).max(5).nullable(),
  notes: z.string().nullable(),
  totalVolumeKg: z.number(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  // TODO: mark WorkoutLog.completed = true, persist final metrics
  return NextResponse.json({ ok: true });
}
