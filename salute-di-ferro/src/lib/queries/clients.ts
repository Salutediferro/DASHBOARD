// Real Prisma queries for the patient module.
// Currently the API routes use mock-clients.ts; switch to these when the
// Supabase <-> Prisma User link is in place for all professionals.

import { prisma } from "@/lib/prisma";
import type {
  CareRelationshipStatus,
  Prisma,
  ProfessionalRole,
} from "@prisma/client";

export type ListPatientsArgs = {
  professionalId: string;
  professionalRole?: ProfessionalRole;
  q?: string;
  status?: CareRelationshipStatus | "ALL";
  page?: number;
  perPage?: number;
  sortBy?: "fullName" | "createdAt";
  sortDir?: "asc" | "desc";
};

export async function listPatientsForProfessional({
  professionalId,
  professionalRole,
  q,
  status = "ALL",
  page = 1,
  perPage = 20,
  sortBy = "fullName",
  sortDir = "asc",
}: ListPatientsArgs) {
  const where: Prisma.CareRelationshipWhereInput = {
    professionalId,
    ...(professionalRole ? { professionalRole } : {}),
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          patient: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [relations, total] = await Promise.all([
    prisma.careRelationship.findMany({
      where,
      include: {
        patient: {
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
          ? { patient: { fullName: sortDir } }
          : { startDate: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.careRelationship.count({ where }),
  ]);

  return { items: relations, total };
}

export async function getPatientDetail(
  professionalId: string,
  patientId: string,
) {
  const relation = await prisma.careRelationship.findFirst({
    where: { professionalId, patientId },
    include: {
      patient: {
        include: {
          biometricLogs: { orderBy: { date: "desc" }, take: 30 },
          checkInsAsPatient: { orderBy: { date: "desc" }, take: 10 },
        },
      },
    },
  });
  return relation;
}

export async function createPatientForProfessional(args: {
  professionalId: string;
  professionalRole: ProfessionalRole;
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  const {
    professionalId,
    professionalRole,
    organizationId,
    fullName,
    email,
    phone,
    notes,
  } = args;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        fullName,
        phone,
        role: "PATIENT",
        organizationId,
      },
    });
    await tx.careRelationship.create({
      data: {
        professionalId,
        professionalRole,
        patientId: user.id,
        notes,
      },
    });
    return user;
  });
}

export async function updateCareRelationshipStatus(
  professionalId: string,
  patientId: string,
  status: CareRelationshipStatus,
) {
  return prisma.careRelationship.updateMany({
    where: { professionalId, patientId },
    data: { status, ...(status === "ARCHIVED" ? { endDate: new Date() } : {}) },
  });
}
