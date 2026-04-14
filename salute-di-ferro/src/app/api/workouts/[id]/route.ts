import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  duplicateTemplate,
  getTemplate,
  saveTemplate,
} from "@/lib/mock-workouts";
import { workoutTemplateSchema } from "@/lib/validators/workout";

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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const t = getTemplate(id);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = workoutTemplateSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  return NextResponse.json(saveTemplate(parsed.data));
}

export async function POST(_req: Request, { params }: Ctx) {
  // Duplicate endpoint: POST /api/workouts/[id]
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const dup = duplicateTemplate(id);
  if (!dup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dup, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireCoach();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ id, deleted: true });
}
