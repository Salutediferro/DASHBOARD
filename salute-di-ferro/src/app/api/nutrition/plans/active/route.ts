import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";

/**
 * GET /api/nutrition/plans/active?patientId=<uuid>
 *
 * Returns the single active plan (archivedAt IS NULL) for a patient, or
 * null. PATIENT defaults to self; DOCTOR/COACH need an ACTIVE
 * CareRelationship; ADMIN can read any.
 */
export async function GET(req: Request) {
  try {
    const me = await requireRole(["PATIENT", "DOCTOR", "COACH", "ADMIN"]);
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId") ?? me.id;

    if (me.role === "PATIENT" && patientId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (me.role === "DOCTOR" || me.role === "COACH") {
      const rel = await prisma.careRelationship.findFirst({
        where: {
          professionalId: me.id,
          patientId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!rel) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const plan = await prisma.nutritionPlan.findFirst({
      where: { patientId, archivedAt: null },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            specialties: true,
          },
        },
      },
    });

    return NextResponse.json(plan);
  } catch (e) {
    return errorResponse(e);
  }
}
