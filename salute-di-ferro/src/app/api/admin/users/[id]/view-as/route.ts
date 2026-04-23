import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/admin/users/[id]/view-as
 *
 * Aggregates everything an admin would glance at for support purposes
 * when a user files a ticket: "why don't I see my report?" / "why isn't
 * my appointment showing?". Returns a role-shaped payload and logs
 * `ADMIN_VIEW_AS` once per fetch (React Query may re-fetch on focus —
 * accepted spam; the pattern of access is the signal we want in audit).
 *
 * Read-only by design: admin role has no write path into these entities,
 * so there's no mutation surface to guard. The UI shows a banner but the
 * API itself is simply a read.
 *
 * The shape differs by role:
 *   - PATIENT: profile + biometrics + appointments + medical reports +
 *     therapy items + symptom logs + care relationships.
 *   - DOCTOR / COACH: profile + caseload + upcoming appointments +
 *     availability slots + reports they uploaded.
 *   - ADMIN: profile only (no one else's admin dashboard is interesting).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole(["ADMIN"]);
    const { id } = await params;

    if (id === me.id) {
      return NextResponse.json(
        { error: "Non puoi visualizzare come te stesso" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        birthDate: true,
        createdAt: true,
        deletedAt: true,
        onboardingCompleted: true,
        organization: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }

    const now = new Date();

    if (user.role === "PATIENT") {
      const [
        biometrics,
        upcomingAppointments,
        pastAppointments,
        medicalReports,
        therapyItems,
        symptomLogs,
        careRelationships,
      ] = await Promise.all([
        prisma.biometricLog.findMany({
          where: { patientId: id },
          orderBy: { date: "desc" },
          take: 10,
        }),
        prisma.appointment.findMany({
          where: { patientId: id, startTime: { gte: now } },
          orderBy: { startTime: "asc" },
          take: 5,
          include: {
            professional: { select: { id: true, fullName: true, role: true } },
          },
        }),
        prisma.appointment.findMany({
          where: { patientId: id, startTime: { lt: now } },
          orderBy: { startTime: "desc" },
          take: 5,
          include: {
            professional: { select: { id: true, fullName: true, role: true } },
          },
        }),
        prisma.medicalReport.findMany({
          where: { patientId: id },
          orderBy: { uploadedAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            category: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            issuedAt: true,
            uploadedAt: true,
            uploadedBy: { select: { id: true, fullName: true } },
          },
        }),
        prisma.therapyItem.findMany({
          where: { patientId: id, active: true },
          orderBy: { startDate: "desc" },
          take: 20,
          select: {
            id: true,
            kind: true,
            name: true,
            dose: true,
            frequency: true,
            startDate: true,
            endDate: true,
            prescribedBy: { select: { id: true, fullName: true } },
          },
        }),
        prisma.symptomLog.findMany({
          where: {
            patientId: id,
            date: { gte: new Date(now.getTime() - 7 * 86400_000) },
          },
          orderBy: { date: "desc" },
        }),
        prisma.careRelationship.findMany({
          where: { patientId: id, status: "ACTIVE" },
          select: {
            id: true,
            professionalRole: true,
            startDate: true,
            professional: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        }),
      ]);

      await logAudit({
        actorId: me.id,
        action: "ADMIN_VIEW_AS",
        entityType: "User",
        entityId: id,
        metadata: { targetRole: user.role, targetEmail: user.email },
        request: req,
      });

      return NextResponse.json({
        user,
        role: "PATIENT" as const,
        biometrics,
        appointments: {
          upcoming: upcomingAppointments,
          past: pastAppointments,
        },
        medicalReports,
        therapyItems,
        symptomLogs,
        careRelationships,
      });
    }

    if (user.role === "DOCTOR" || user.role === "COACH") {
      const [
        caseload,
        upcomingAppointments,
        availabilitySlots,
        uploadedReports,
      ] = await Promise.all([
        prisma.careRelationship.findMany({
          where: { professionalId: id, status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 10,
          select: {
            id: true,
            startDate: true,
            patient: {
              select: {
                id: true,
                fullName: true,
                email: true,
                deletedAt: true,
              },
            },
          },
        }),
        prisma.appointment.findMany({
          where: { professionalId: id, startTime: { gte: now } },
          orderBy: { startTime: "asc" },
          take: 10,
          include: {
            patient: { select: { id: true, fullName: true } },
          },
        }),
        prisma.availabilitySlot.findMany({
          where: { professionalId: id },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          take: 20,
        }),
        prisma.medicalReport.findMany({
          where: { uploadedById: id },
          orderBy: { uploadedAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            category: true,
            uploadedAt: true,
            patient: { select: { id: true, fullName: true } },
          },
        }),
      ]);

      await logAudit({
        actorId: me.id,
        action: "ADMIN_VIEW_AS",
        entityType: "User",
        entityId: id,
        metadata: { targetRole: user.role, targetEmail: user.email },
        request: req,
      });

      return NextResponse.json({
        user,
        role: user.role,
        caseload,
        upcomingAppointments,
        availabilitySlots,
        uploadedReports,
      });
    }

    // ADMIN target: nothing useful to surface beyond the profile itself.
    await logAudit({
      actorId: me.id,
      action: "ADMIN_VIEW_AS",
      entityType: "User",
      entityId: id,
      metadata: { targetRole: user.role, targetEmail: user.email },
      request: req,
    });

    return NextResponse.json({ user, role: user.role });
  } catch (e) {
    return errorResponse(e);
  }
}
