import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { getConversationForMember } from "@/lib/services/conversations";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/conversations/[id]/read
 *
 * Marks the thread as read for the caller by setting their own
 * lastReadAt to "now". Used when the client opens or scrolls through
 * the thread; callers that send a message are auto-read via the
 * POST messages endpoint.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);
    const { id } = await params;

    const conversation = await getConversationForMember(id, me.id);
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: me.id } },
      data: { lastReadAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
