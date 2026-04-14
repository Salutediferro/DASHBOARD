import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/me/export
 *
 * GDPR Art. 15 / Art. 20 (right of access + right to data portability).
 * Returns a full JSON dump of every row the caller owns: profile,
 * biometric logs, medical reports (metadata only, no signed URLs),
 * appointments, care relationships, notifications. File contents are
 * deliberately excluded — a patient needing the actual files fetches
 * them one by one through the normal signed-URL flow.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [
    biometrics,
    appointmentsAsPatient,
    appointmentsAsProfessional,
    medicalReportsAsPatient,
    medicalReportsAsUploader,
    reportPermissions,
    careRelationshipsAsProfessional,
    careRelationshipsAsPatient,
    notifications,
    auditLogs,
  ] = await Promise.all([
    prisma.biometricLog.findMany({
      where: { patientId: me.id },
      orderBy: { date: "desc" },
    }),
    prisma.appointment.findMany({
      where: { patientId: me.id },
      orderBy: { startTime: "desc" },
    }),
    prisma.appointment.findMany({
      where: { professionalId: me.id },
      orderBy: { startTime: "desc" },
    }),
    prisma.medicalReport.findMany({
      where: { patientId: me.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.medicalReport.findMany({
      where: { uploadedById: me.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.reportPermission.findMany({
      where: { granteeId: me.id },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.careRelationship.findMany({
      where: { professionalId: me.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.careRelationship.findMany({
      where: { patientId: me.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { actorId: me.id },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user: {
      ...me,
      birthDate: me.birthDate ? me.birthDate.toISOString().slice(0, 10) : null,
    },
    biometrics,
    appointments: {
      asPatient: appointmentsAsPatient,
      asProfessional: appointmentsAsProfessional,
    },
    medicalReports: {
      asPatient: medicalReportsAsPatient,
      asUploader: medicalReportsAsUploader,
    },
    reportPermissions,
    careRelationships: {
      asProfessional: careRelationshipsAsProfessional,
      asPatient: careRelationshipsAsPatient,
    },
    notifications,
    auditLogs,
  };

  await logAudit({
    actorId: me.id,
    action: "USER_EXPORT",
    entityType: "User",
    entityId: me.id,
    metadata: {
      biometrics: biometrics.length,
      appointments:
        appointmentsAsPatient.length + appointmentsAsProfessional.length,
      medicalReports:
        medicalReportsAsPatient.length + medicalReportsAsUploader.length,
    },
    request: req,
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="salute-di-ferro-export-${me.id}.json"`,
    },
  });
}
