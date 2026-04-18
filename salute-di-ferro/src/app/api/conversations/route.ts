import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import {
  canMessage,
  findOrCreateDmConversation,
} from "@/lib/services/conversations";

const createSchema = z.object({
  participantId: z.string().uuid(),
});

/**
 * GET /api/conversations
 *
 * Every conversation the caller is a member of, with the other
 * participant embedded, the last message preview and a per-caller
 * unread count (messages sent by anyone else after the caller's
 * lastReadAt). Sorted by activity desc.
 */
export async function GET() {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);

    const rows = await prisma.conversation.findMany({
      where: { members: { some: { userId: me.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    const items = await Promise.all(
      rows.map(async (c) => {
        const myMembership = c.members.find((m) => m.userId === me.id);
        const others = c.members.filter((m) => m.userId !== me.id);
        // For 1:1 the "other" is unique; for future group chats this
        // returns the full list and the client picks what to show.
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: me.id },
            ...(myMembership?.lastReadAt
              ? { createdAt: { gt: myMembership.lastReadAt } }
              : {}),
          },
        });
        return {
          id: c.id,
          updatedAt: c.updatedAt.toISOString(),
          lastMessage: c.messages[0]
            ? {
                id: c.messages[0].id,
                body: c.messages[0].body,
                senderId: c.messages[0].senderId,
                createdAt: c.messages[0].createdAt.toISOString(),
              }
            : null,
          unreadCount,
          others: others.map((m) => m.user),
        };
      }),
    );

    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/conversations { participantId }
 *
 * Returns the existing 1:1 conversation with that user or creates a
 * new one. Authorization is delegated to canMessage() so a patient
 * can only open threads with their linked professionals (and vice
 * versa); admin is unrestricted.
 */
export async function POST(req: Request) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const otherId = parsed.data.participantId;

    const allowed = await canMessage(
      { id: me.id, role: me.role },
      otherId,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, created } = await findOrCreateDmConversation(me.id, otherId);
    return NextResponse.json({ id, created }, { status: created ? 201 : 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
