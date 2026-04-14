import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { markAllAsRead } from "@/lib/services/notifications";

export async function POST() {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);
    const count = await markAllAsRead(me.id);
    return NextResponse.json({ success: true, count });
  } catch (e) {
    return errorResponse(e);
  }
}
