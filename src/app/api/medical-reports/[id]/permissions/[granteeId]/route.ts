import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  auditMedicalReportAccess,
  resolveCaller,
} from "@/lib/medical-records/access";

type Ctx = { params: Promise<{ id: string; granteeId: string }> };

/**
 * DELETE /api/medical-reports/[id]/permissions/[granteeId]
 *
 * Revoke a grantee's access to a report. Only the owner patient or the
 * grantee themselves (giving up their own access) may revoke. The row is
 * kept with revokedAt set, so the audit trail is preserved.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, granteeId } = await params;

  const report = await prisma.medicalReport.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = report.patientId === me.id;
  const isGrantee = granteeId === me.id;
  if (!isOwner && !isGrantee && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.reportPermission.findUnique({
    where: {
      reportId_granteeId: { reportId: report.id, granteeId },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Permission not found" },
      { status: 404 },
    );
  }

  if (existing.revokedAt) {
    return NextResponse.json({ revoked: true, alreadyRevoked: true });
  }

  await prisma.reportPermission.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  await auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: report.id,
    patientId: report.patientId,
    action: "PERMISSION_REVOKE",
    extra: { granteeId },
    request: req,
  });

  return NextResponse.json({ revoked: true });
}
