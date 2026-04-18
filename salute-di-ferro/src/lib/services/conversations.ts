import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Authorization gate for starting or continuing a DM.
 *
 *   - PATIENT ↔ PROFESSIONAL: require an ACTIVE CareRelationship
 *     (either direction) so random users can't DM strangers.
 *   - ADMIN: always allowed (for support / moderation).
 *   - Two patients: denied.
 *   - Two professionals: denied for now (v1 is patient ↔ pro only).
 *
 * Returns `true` when the call should proceed.
 */
export async function canMessage(
  caller: { id: string; role: UserRole },
  otherId: string,
): Promise<boolean> {
  if (caller.id === otherId) return false;
  if (caller.role === "ADMIN") return true;

  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, role: true },
  });
  if (!other) return false;
  if (other.role === "ADMIN") return true;

  const isCallerPatient = caller.role === "PATIENT";
  const isOtherPatient = other.role === "PATIENT";
  // Reject same-role pairs (patient/patient, pro/pro).
  if (isCallerPatient === isOtherPatient) return false;

  const patientId = isCallerPatient ? caller.id : otherId;
  const professionalId = isCallerPatient ? otherId : caller.id;

  const rel = await prisma.careRelationship.findFirst({
    where: { patientId, professionalId, status: "ACTIVE" },
    select: { id: true },
  });
  return !!rel;
}

/**
 * Look up an existing 1:1 conversation between the two users, or
 * create a new one atomically. A "1:1 conversation" here is any
 * Conversation whose member set is exactly {a, b}.
 */
export async function findOrCreateDmConversation(
  a: string,
  b: string,
): Promise<{ id: string; created: boolean }> {
  // Find by intersecting membership — a conversation that has BOTH
  // members is what we want. We filter down to the exact 2-member
  // case in JS, since SQL "exactly these members" is fiddly.
  const candidates = await prisma.conversation.findMany({
    where: {
      AND: [
        { members: { some: { userId: a } } },
        { members: { some: { userId: b } } },
      ],
    },
    select: {
      id: true,
      _count: { select: { members: true } },
    },
  });
  const existing = candidates.find((c) => c._count.members === 2);
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.conversation.create({
    data: {
      members: {
        create: [{ userId: a }, { userId: b }],
      },
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

/**
 * Returns the conversation iff the caller is a member. Used as a
 * single-shot authorization helper before listing / posting messages.
 */
export async function getConversationForMember(
  conversationId: string,
  userId: string,
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      members: { some: { userId } },
    },
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
    },
  });
}
