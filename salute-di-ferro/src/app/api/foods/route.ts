import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods, type FoodCategory } from "@/lib/data/foods";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("search") ?? searchParams.get("q") ?? undefined;
  const category = (searchParams.get("category") ?? "ALL") as FoodCategory | "ALL";
  return NextResponse.json(searchFoods(q, category));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // TODO: persist custom food to DB; for now echo
  return NextResponse.json(
    { id: `fd-custom-${Date.now()}`, ...body },
    { status: 201 },
  );
}
