import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import {
  canMessageMany,
  findOrCreateConversation,
} from "@/lib/services/conversations";

// Accepts both shapes:
//   { participantId: "<uuid>" }                — legacy 1:1
//   { participantIds: ["<uuid>", "<uuid>"] }   — group (≥1 entry, dedup'd)
// We normalize to a non-empty array of UUIDs before the auth gate.
const createSchema = z
  .object({
    participantId: z.string().uuid().optional(),
    participantIds: z.array(z.string().uuid()).min(1).max(10).optional(),
  })
  .refine((v) => !!v.participantId || !!v.participantIds, {
    message: "participantId or participantIds richiesto",
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
 * POST /api/conversations { participantId | participantIds }
 *
 * Returns the existing conversation whose member set is exactly
 * {caller} ∪ {participants}, or creates a new one. Group chats (3+
 * members) are patient-initiated only — see `canMessageMany` for the
 * rationale. Pros and admins keep the 1:1 path.
 */
export async function POST(req: Request) {
  try {
    const me = await requireRole(["ADMIN", "DOCTOR", "COACH", "PATIENT"]);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const otherIds = parsed.data.participantIds ?? [parsed.data.participantId!];

    const allowed = await canMessageMany(
      { id: me.id, role: me.role },
      otherIds,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, created } = await findOrCreateConversation([me.id, ...otherIds]);
    return NextResponse.json({ id, created }, { status: created ? 201 : 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
