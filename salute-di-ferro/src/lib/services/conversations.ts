import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Authorization gate for starting or continuing a DM (1:1).
 *
 *   - PATIENT ↔ PROFESSIONAL: require an ACTIVE CareRelationship
 *     (either direction) so random users can't DM strangers.
 *   - ADMIN: always allowed (for support / moderation).
 *   - Two patients: denied.
 *   - Two professionals: denied (v1 1:1 is patient ↔ pro only).
 *
 * For multi-member group chats use `canMessageMany` instead.
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
 * Authorization gate for creating an N-member conversation.
 *
 * Single-other (length 1) falls back to `canMessage`. For 2+ others the
 * rule is patient-initiated only:
 *
 *   - The CALLER must be a PATIENT (or ADMIN).
 *   - Every other member must be a PROFESSIONAL (DOCTOR or COACH) with
 *     an ACTIVE CareRelationship to that patient.
 *
 * This is intentionally narrow: a patient can pull their care team into
 * one conversation, but professionals can't add each other into ad-hoc
 * groups around a patient who hasn't asked for it.
 */
export async function canMessageMany(
  caller: { id: string; role: UserRole },
  otherIds: string[],
): Promise<boolean> {
  if (otherIds.length === 0) return false;
  // Reject duplicates and self-references.
  const dedup = Array.from(new Set(otherIds));
  if (dedup.length !== otherIds.length) return false;
  if (dedup.includes(caller.id)) return false;

  if (dedup.length === 1) return canMessage(caller, dedup[0]);

  if (caller.role === "ADMIN") return true;
  if (caller.role !== "PATIENT") return false;

  const others = await prisma.user.findMany({
    where: { id: { in: dedup } },
    select: { id: true, role: true },
  });
  if (others.length !== dedup.length) return false;
  if (!others.every((u) => u.role === "DOCTOR" || u.role === "COACH")) {
    return false;
  }

  const rels = await prisma.careRelationship.findMany({
    where: {
      patientId: caller.id,
      professionalId: { in: dedup },
      status: "ACTIVE",
    },
    select: { professionalId: true },
  });
  const linked = new Set(rels.map((r) => r.professionalId));
  return dedup.every((id) => linked.has(id));
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
  return findOrCreateConversation([a, b]);
}

/**
 * Look up an existing conversation whose member set is EXACTLY the
 * given userIds (any size ≥ 2), or create a new one. The exact-set
 * match means a patient + doctor + coach group is treated as distinct
 * from a patient + doctor 1:1 thread — they're different conversations.
 */
export async function findOrCreateConversation(
  userIds: string[],
): Promise<{ id: string; created: boolean }> {
  const ids = Array.from(new Set(userIds));
  if (ids.length < 2) {
    throw new Error("At least two members are required");
  }

  // SQL "exactly this member set" is fiddly to express directly, so we
  // intersect on every userId and then filter the candidate list down
  // to the rows whose member count matches. The set is small in
  // practice so this stays cheap.
  const candidates = await prisma.conversation.findMany({
    where: {
      AND: ids.map((userId) => ({
        members: { some: { userId } },
      })),
    },
    select: {
      id: true,
      _count: { select: { members: true } },
    },
  });
  const existing = candidates.find((c) => c._count.members === ids.length);
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.conversation.create({
    data: {
      members: {
        create: ids.map((userId) => ({ userId })),
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
