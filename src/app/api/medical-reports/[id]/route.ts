import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  MEDICAL_REPORTS_BUCKET,
} from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { updateMedicalReportSchema } from "@/lib/validators/medical-report";
import {
  auditMedicalReportAccess,
  checkReportReadAccess,
  resolveCaller,
} from "@/lib/medical-records/access";

const SIGNED_URL_TTL = 60 * 15; // 15 minutes

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/medical-reports/[id]
 * Returns the report metadata + a fresh signed URL (15 min) for the file.
 * Enforces the double-check access matrix via checkReportReadAccess.
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
  const access = await checkReportReadAccess(me, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(MEDICAL_REPORTS_BUCKET)
    .createSignedUrl(access.report.fileUrl, SIGNED_URL_TTL);
  if (signErr) {
    return NextResponse.json(
      { error: `Signed URL failed: ${signErr.message}` },
      { status: 500 },
    );
  }

  auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: access.report.id,
    patientId: access.report.patientId,
    action: "VIEW",
    extra: { viaRole: access.role },
  });

  return NextResponse.json({
    id: access.report.id,
    patientId: access.report.patientId,
    uploadedById: access.report.uploadedById,
    fileName: access.report.fileName,
    mimeType: access.report.mimeType,
    fileSize: access.report.fileSize,
    category: access.report.category,
    title: access.report.title,
    notes: access.report.notes,
    issuedAt: access.report.issuedAt
      ? access.report.issuedAt.toISOString().slice(0, 10)
      : null,
    uploadedAt: access.report.uploadedAt.toISOString(),
    signedUrl: signed.signedUrl,
    signedUrlExpiresIn: SIGNED_URL_TTL,
  });
}

/**
 * PATCH /api/medical-reports/[id]
 * Only the patient owner (or the uploader doctor) may edit metadata.
 * File replacement is not supported — upload a new report instead.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.medicalReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = report.patientId === me.id;
  const isUploader = report.uploadedById === me.id;
  if (!isOwner && !isUploader && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateMedicalReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.issuedAt !== undefined) {
    data.issuedAt = parsed.data.issuedAt
      ? new Date(parsed.data.issuedAt)
      : null;
  }

  const updated = await prisma.medicalReport.update({ where: { id }, data });

  auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: id,
    patientId: report.patientId,
    action: "UPDATE",
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    category: updated.category,
    notes: updated.notes,
    issuedAt: updated.issuedAt
      ? updated.issuedAt.toISOString().slice(0, 10)
      : null,
  });
}

/**
 * DELETE /api/medical-reports/[id]
 * Hard delete: removes the DB row AND the storage object. Patient owner
 * or uploader may delete. ReportPermission rows cascade.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.medicalReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = report.patientId === me.id;
  const isUploader = report.uploadedById === me.id;
  if (!isOwner && !isUploader && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error: delErr } = await admin.storage
    .from(MEDICAL_REPORTS_BUCKET)
    .remove([report.fileUrl]);
  if (delErr) {
    // Log but continue — we still want the DB row gone so the file is
    // no longer listed. Orphaned storage object will surface in an
    // operator cleanup job.
    console.warn(
      `[medical-reports] storage remove failed for ${report.fileUrl}: ${delErr.message}`,
    );
  }

  await prisma.medicalReport.delete({ where: { id } });

  auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: id,
    patientId: report.patientId,
    action: "DELETE",
  });

  return NextResponse.json({ deleted: true });
}
