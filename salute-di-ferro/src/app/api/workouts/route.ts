import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftTemplate,
  listTemplates,
  type Difficulty,
  type WorkoutType,
} from "@/lib/mock-workouts";

async function requireCoach() {
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

export async function GET(req: Request) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const type = (searchParams.get("type") ?? "ALL") as WorkoutType | "ALL";
  const difficulty = (searchParams.get("difficulty") ?? "ALL") as
    | Difficulty
    | "ALL";

  return NextResponse.json(listTemplates({ q, type, difficulty }));
}

export async function POST() {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const draft = createDraftTemplate();
  return NextResponse.json(draft, { status: 201 });
}
