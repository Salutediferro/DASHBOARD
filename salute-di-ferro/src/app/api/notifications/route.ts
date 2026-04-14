import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-client";
import { listNotifications, getUnreadCount } from "@/lib/services/notifications";

export async function GET(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  const countOnly = url.searchParams.get("countOnly") === "1";
  const limit = Number(url.searchParams.get("limit") ?? 50);

  if (countOnly) {
    const count = await getUnreadCount(userId);
    return NextResponse.json({ count });
  }

  const notifications = await listNotifications(userId, { unreadOnly, limit });
  const unreadCount = await getUnreadCount(userId);
  return NextResponse.json({ notifications, unreadCount });
}
