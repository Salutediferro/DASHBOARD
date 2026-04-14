import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientDashboardMock } from "@/lib/mock-client-dashboard";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getClientDashboardMock());
}
