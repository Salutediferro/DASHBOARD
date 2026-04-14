import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aggregateShoppingList } from "@/lib/mock-nutrition";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const { searchParams } = new URL(req.url);
  const weeks = Number(searchParams.get("weeks") ?? "1");
  return NextResponse.json(aggregateShoppingList(planId, weeks));
}
