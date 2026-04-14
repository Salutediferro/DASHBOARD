import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanForClient } from "@/lib/mock-nutrition";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plan = getActivePlanForClient();
  return NextResponse.json(plan);
}
