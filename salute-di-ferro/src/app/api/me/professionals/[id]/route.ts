import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/me/professionals/[relationshipId]
 *
 * Patient revokes a previously granted access. The CareRelationship is
 * archived (status=ARCHIVED + endDate=now), keeping audit/history; a
 * fresh grant later re-activates the same row via POST /api/me/professionals.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["PATIENT"]);
    const { id } = await params;

    const rel = await prisma.careRelationship.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        professionalId: true,
        status: true,
      },
    });
    if (!rel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (rel.patientId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (rel.status === "ARCHIVED") {
      return NextResponse.json({ ok: true, alreadyArchived: true });
    }

    await prisma.careRelationship.update({
      where: { id },
      data: { status: "ARCHIVED", endDate: new Date() },
    });

    await logAudit({
      actorId: me.id,
      action: "CARE_RELATIONSHIP_REVOKE",
      entityType: "CareRelationship",
      entityId: id,
      metadata: { professionalId: rel.professionalId },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
