import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/mock-ai";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? undefined;
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  // Clients only see their own; coaches can pass userId or get all.
  if (role === "COACH" || role === "ADMIN") {
    return NextResponse.json(listConversations(userId));
  }
  return NextResponse.json(listConversations(user.id));
}
