import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { getConversationForMember } from "@/lib/services/conversations";
import { createNotification } from "@/lib/services/notifications";

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/conversations/[id]/messages
 *
 * Full thread (asc). Caller must be a member — the service helper
 * returns null otherwise. Returning everything is fine at v1 scale
 * (a 1:1 thread won't practically grow past a few hundred messages);
 * if it ever does, add ?before= cursor pagination here.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);
    const { id } = await params;

    const conversation = await getConversationForMember(id, me.id);
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        body: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        members: conversation.members.map((m) => ({
          userId: m.userId,
          lastReadAt: m.lastReadAt?.toISOString() ?? null,
          user: m.user,
        })),
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/conversations/[id]/messages  { body }
 *
 * Write a new message and bump the conversation's updatedAt (used
 * for inbox ordering). A notification is fired at every *other*
 * member so the recipient sees something in their bell even if
 * they're not inside the thread.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);
    const { id } = await params;

    const conversation = await getConversationForMember(id, me.id);
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: me.id,
          body: parsed.data.body,
        },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
        },
      }),
      // Prisma's `@updatedAt` only fires on update, so we explicitly
      // update the parent conversation to surface it in the inbox.
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
      // Sender just read everything up to "now" by definition.
      prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: me.id } },
        data: { lastReadAt: new Date() },
      }),
    ]);

    // Fire-and-forget notifications to the other members.
    const recipients = conversation.members
      .filter((m) => m.userId !== me.id)
      .map((m) => m.userId);
    const sender = conversation.members.find((m) => m.userId === me.id)?.user;
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          userId,
          type: "SYSTEM",
          title: `Nuovo messaggio da ${sender?.fullName ?? "un utente"}`,
          body: parsed.data.body.slice(0, 140),
          actionUrl: `/dashboard/messages/${id}`,
        }).catch(() => undefined),
      ),
    );

    return NextResponse.json(
      {
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
