import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { isProfessionalSpecialty } from "@/lib/professional-specialties";

/**
 * GET /api/professionals/search?q=<text>&specialty=<canonical>
 *
 * Patient-only search across DOCTORs in the same organization.
 * - `q`: matches first/last/fullName (case-insensitive).
 * - `specialty`: must be one of PROFESSIONAL_SPECIALTIES; matched against
 *   the user's `specialties` array via Prisma `has`.
 *
 * Returns up to 25 rows. Excludes the current user. Excludes
 * soft-deleted accounts. Each row carries a `linked` flag so the UI can
 * mark professionals already in the patient's ACTIVE care list.
 */
export async function GET(req: Request) {
  try {
    const me = await requireRole(["PATIENT"]);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const specialty = url.searchParams.get("specialty")?.trim() ?? "";

    if (specialty && !isProfessionalSpecialty(specialty)) {
      return NextResponse.json([]);
    }

    const patient = await prisma.user.findUnique({
      where: { id: me.id },
      select: { organizationId: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters: Prisma.UserWhereInput = {
      role: "DOCTOR",
      organizationId: patient.organizationId,
      deletedAt: null,
      id: { not: me.id },
    };
    if (q.length > 0) {
      filters.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ];
    }
    if (specialty) {
      filters.specialties = { has: specialty };
    }

    const [pros, links] = await Promise.all([
      prisma.user.findMany({
        where: filters,
        // Sort accepting professionals first so the patient sees who's
        // actually bookable at the top, with alphabetical order as
        // tiebreaker.
        orderBy: [{ acceptingPatients: "desc" }, { fullName: "asc" }],
        take: 25,
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          bio: true,
          specialties: true,
          acceptingPatients: true,
        },
      }),
      prisma.careRelationship.findMany({
        where: {
          patientId: me.id,
          professionalRole: "DOCTOR",
          status: "ACTIVE",
        },
        select: { professionalId: true },
      }),
    ]);

    const linkedSet = new Set(links.map((l) => l.professionalId));

    return NextResponse.json(
      pros.map((p) => ({ ...p, linked: linkedSet.has(p.id) })),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
