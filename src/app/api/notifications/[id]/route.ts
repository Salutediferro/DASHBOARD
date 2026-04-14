import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { markAsRead } from "@/lib/services/notifications";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);
    const { id } = await params;
    const ok = await markAsRead(id, me.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
