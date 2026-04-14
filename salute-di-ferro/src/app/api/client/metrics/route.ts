import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  weightKg: z.number().min(30).max(250).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  energyLevel: z.number().int().min(1).max(10).nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  // TODO: upsert into BiometricLog
  return NextResponse.json({ saved: true, ...parsed.data });
}
