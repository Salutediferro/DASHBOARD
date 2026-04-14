// Real Prisma queries for the client module.
// Currently the API routes use mock-clients.ts; switch to these when the
// Supabase <-> Prisma User link is in place for all coaches.

import { prisma } from "@/lib/prisma";
import type { CoachClientStatus, Prisma } from "@prisma/client";

export type ListClientsArgs = {
  coachId: string;
  q?: string;
  status?: CoachClientStatus | "ALL";
  page?: number;
  perPage?: number;
  sortBy?: "fullName" | "createdAt";
  sortDir?: "asc" | "desc";
};

export async function listClientsForCoach({
  coachId,
  q,
  status = "ALL",
  page = 1,
  perPage = 20,
  sortBy = "fullName",
  sortDir = "asc",
}: ListClientsArgs) {
  const where: Prisma.CoachClientWhereInput = {
    coachId,
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          client: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [relations, total] = await Promise.all([
    prisma.coachClient.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy:
        sortBy === "fullName"
          ? { client: { fullName: sortDir } }
          : { startDate: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.coachClient.count({ where }),
  ]);

  return { items: relations, total };
}

export async function getClientDetail(coachId: string, clientId: string) {
  const relation = await prisma.coachClient.findFirst({
    where: { coachId, clientId },
    include: {
      client: {
        include: {
          workoutLogs: { orderBy: { date: "desc" }, take: 10 },
          biometricLogs: { orderBy: { date: "desc" }, take: 30 },
          checkInsAsClient: { orderBy: { date: "desc" }, take: 10 },
          clientNutritionPlans: {
            where: { isActive: true },
            include: { meals: true },
            take: 1,
          },
        },
      },
    },
  });
  return relation;
}

export async function createClientForCoach(args: {
  coachId: string;
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  const { coachId, organizationId, fullName, email, phone, notes } = args;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        fullName,
        phone,
        role: "CLIENT",
        organizationId,
      },
    });
    await tx.coachClient.create({
      data: { coachId, clientId: user.id, notes },
    });
    return user;
  });
}

export async function updateClientStatus(
  coachId: string,
  clientId: string,
  status: CoachClientStatus,
) {
  return prisma.coachClient.updateMany({
    where: { coachId, clientId },
    data: { status, ...(status === "ARCHIVED" ? { endDate: new Date() } : {}) },
  });
}
