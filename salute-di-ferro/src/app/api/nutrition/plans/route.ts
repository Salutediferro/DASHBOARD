import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createPlanSchema } from "@/lib/validators/nutrition";
import {
  NutritionAclError,
  createPlan,
  listPlansForCaller,
} from "@/lib/queries/nutrition";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId") ?? undefined;

  const plans = await listPlansForCaller(me, { patientId });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const plan = await createPlan(me, parsed.data);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    return nutritionErrorResponse(e);
  }
}

function nutritionErrorResponse(e: unknown) {
  if (e instanceof NutritionAclError) {
    const status =
      e.code === "not_found" ? 404 : e.code === "invalid_role" ? 403 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  console.error("[nutrition/plans] unexpected error", e);
  return NextResponse.json({ error: "Errore interno" }, { status: 500 });
}
