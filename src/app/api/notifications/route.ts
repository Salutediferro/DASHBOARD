import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { listNotifications, getUnreadCount } from "@/lib/services/notifications";

export async function GET(req: Request) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "1";
    const countOnly = url.searchParams.get("countOnly") === "1";
    const limit = Number(url.searchParams.get("limit") ?? 50);

    if (countOnly) {
      const count = await getUnreadCount(me.id);
      return NextResponse.json({ count });
    }

    const notifications = await listNotifications(me.id, { unreadOnly, limit });
    const unreadCount = await getUnreadCount(me.id);
    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    return errorResponse(e);
  }
}
