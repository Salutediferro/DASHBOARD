import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDraftPlan, listPlans } from "@/lib/mock-nutrition";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listPlans());
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(createDraftPlan(), { status: 201 });
}
