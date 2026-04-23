import { prisma } from "@/lib/prisma";

/**
 * Builds the GDPR Art. 15 / Art. 20 data export payload for a user.
 *
 * Shared between `/api/me/export` (self-service) and the admin-triggered
 * endpoint under `/api/admin/users/[id]/export` so the two stay in sync —
 * if we add a new entity to the export, every caller picks it up.
 *
 * Returns a plain object. Callers decide auth, filename, audit log.
 *
 * Note: medical report *file bytes* are deliberately not dumped here; the
 * payload contains their metadata (fileName, mimeType, fileSize, fileUrl)
 * and the recipient can fetch each file individually with a signed URL.
 * That keeps this endpoint a single JSON round-trip instead of a multi-GB
 * streaming monster.
 */
export async function buildUserExport(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

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
      where: { patientId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.appointment.findMany({
      where: { patientId: user.id },
      orderBy: { startTime: "desc" },
    }),
    prisma.appointment.findMany({
      where: { professionalId: user.id },
      orderBy: { startTime: "desc" },
    }),
    prisma.medicalReport.findMany({
      where: { patientId: user.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.medicalReport.findMany({
      where: { uploadedById: user.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.reportPermission.findMany({
      where: { granteeId: user.id },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.careRelationship.findMany({
      where: { professionalId: user.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.careRelationship.findMany({
      where: { patientId: user.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user: {
      ...user,
      birthDate: user.birthDate
        ? user.birthDate.toISOString().slice(0, 10)
        : null,
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

  const counts = {
    biometrics: biometrics.length,
    appointments:
      appointmentsAsPatient.length + appointmentsAsProfessional.length,
    medicalReports:
      medicalReportsAsPatient.length + medicalReportsAsUploader.length,
  };

  return { payload, counts };
}
