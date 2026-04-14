import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { grantPermissionSchema } from "@/lib/validators/medical-report";
import {
  auditMedicalReportAccess,
  resolveCaller,
} from "@/lib/medical-records/access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/medical-reports/[id]/permissions
 * List active permissions on a report. Only the owner patient and admins
 * may see the full grantee list.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.medicalReport.findUnique({
    where: { id },
    select: { patientId: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = report.patientId === me.id;
  if (!isOwner && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.reportPermission.findMany({
    where: { reportId: id },
    orderBy: { grantedAt: "desc" },
    include: {
      grantee: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      granteeId: r.granteeId,
      grantee: r.grantee,
      grantedAt: r.grantedAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      active: r.revokedAt == null && (!r.expiresAt || r.expiresAt > new Date()),
    })),
  );
}

/**
 * POST /api/medical-reports/[id]/permissions
 * Grant a professional access to a report. Only the owner patient may
 * grant. The grantee must:
 *   - exist
 *   - have role DOCTOR or COACH
 *   - have an ACTIVE CareRelationship with the patient
 *
 * If a revoked or expired permission already exists for the same
 * (reportId, granteeId), it is reactivated in place.
 */
export async function POST(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.medicalReport.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (report.patientId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = grantPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { granteeId, expiresAt } = parsed.data;

  const grantee = await prisma.user.findUnique({
    where: { id: granteeId },
    select: { id: true, role: true },
  });
  if (!grantee) {
    return NextResponse.json({ error: "Grantee not found" }, { status: 404 });
  }
  if (grantee.role !== "DOCTOR" && grantee.role !== "COACH") {
    return NextResponse.json(
      { error: "Solo DOCTOR o COACH possono ricevere accesso" },
      { status: 400 },
    );
  }

  // Verify the professional actually has an active CareRelationship
  // with the patient. Without this, a patient could grant a random
  // professional access to their file.
  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId: grantee.id,
      patientId: report.patientId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!rel) {
    return NextResponse.json(
      { error: "Nessuna relazione attiva con questo professionista" },
      { status: 400 },
    );
  }

  const permission = await prisma.reportPermission.upsert({
    where: {
      reportId_granteeId: { reportId: report.id, granteeId: grantee.id },
    },
    update: {
      revokedAt: null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      grantedAt: new Date(),
    },
    create: {
      reportId: report.id,
      granteeId: grantee.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: report.id,
    patientId: report.patientId,
    action: "PERMISSION_GRANT",
    extra: { granteeId: grantee.id, expiresAt },
    request: req,
  });

  return NextResponse.json(
    {
      id: permission.id,
      granteeId: permission.granteeId,
      grantedAt: permission.grantedAt.toISOString(),
      expiresAt: permission.expiresAt?.toISOString() ?? null,
      revokedAt: null,
    },
    { status: 201 },
  );
}
