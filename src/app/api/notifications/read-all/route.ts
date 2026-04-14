import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-client";
import { markAllAsRead } from "@/lib/services/notifications";

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await markAllAsRead(userId);
  return NextResponse.json({ success: true, count });
}
