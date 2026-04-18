import { NextResponse } from "next/server";
import type { Sex, UserRole } from "@prisma/client";
import { createClient, resolveAuthUser } from "@/lib/supabase/server";
import { createAdminClient, MEDICAL_REPORTS_BUCKET } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { profilePatchSchema } from "@/lib/validators/profile";
import { logAudit } from "@/lib/audit";

/** Days between soft-delete (DELETE /api/me) and scheduled hard delete. */
const HARD_DELETE_DELAY_DAYS = 30;

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  sex: true,
  birthDate: true,
  heightCm: true,
  phone: true,
  avatarUrl: true,
  taxCode: true,
  emergencyContact: true,
  role: true,
  onboardingCompleted: true,
  medicalConditions: true,
  allergies: true,
  medications: true,
  injuries: true,
  bio: true,
  specialties: true,
} as const;

type DbUser = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  sex: Sex | null;
  birthDate: Date | null;
  heightCm: number | null;
  phone: string | null;
  avatarUrl: string | null;
  taxCode: string | null;
  emergencyContact: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  injuries: string | null;
  bio: string | null;
  specialties: string | null;
};

function serializeUser(u: DbUser) {
  return {
    ...u,
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
  };
}

export async function GET(req: Request) {
  // Accept either cookie session (web) or Bearer JWT (mobile).
  const user = await resolveAuthUser(req);
  if (!user) return NextResponse.json(null, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: USER_SELECT,
  });

  if (!dbUser) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(serializeUser(dbUser));
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const updates: Record<string, unknown> = {};
  if (data.firstName !== undefined) updates.firstName = data.firstName;
  if (data.lastName !== undefined) updates.lastName = data.lastName;
  if (data.sex !== undefined) updates.sex = data.sex;
  if (data.birthDate !== undefined) {
    updates.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  }
  if (data.heightCm !== undefined) updates.heightCm = data.heightCm;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.taxCode !== undefined) updates.taxCode = data.taxCode;
  if (data.emergencyContact !== undefined)
    updates.emergencyContact = data.emergencyContact;

  if (data.medicalConditions !== undefined)
    updates.medicalConditions = data.medicalConditions;
  if (data.allergies !== undefined) updates.allergies = data.allergies;
  if (data.medications !== undefined) updates.medications = data.medications;
  if (data.injuries !== undefined) updates.injuries = data.injuries;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.specialties !== undefined) updates.specialties = data.specialties;

  // Keep fullName in sync when first/last name changes
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    });
    const fn = data.firstName !== undefined ? data.firstName : current?.firstName;
    const ln = data.lastName !== undefined ? data.lastName : current?.lastName;
    const composed = [fn, ln].filter(Boolean).join(" ").trim();
    if (composed.length > 0) updates.fullName = composed;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: USER_SELECT,
  });

  await logAudit({
    actorId: user.id,
    action: "PROFILE_UPDATE",
    entityType: "User",
    entityId: user.id,
    metadata: { fields: Object.keys(updates) },
    request: req,
  });

  return NextResponse.json(serializeUser(updated));
}

/**
 * DELETE /api/me
 *
 * GDPR Art. 17 — right to erasure. Performs a soft delete on the User
 * row (sets deletedAt), revokes every outgoing ReportPermission (so
 * any professional immediately loses access), archives every active
 * CareRelationship in which the caller is the patient, and removes
 * the caller's files from the private medical-reports bucket. The
 * Prisma row is kept for `HARD_DELETE_DELAY_DAYS` so the audit trail
 * and any legal retention requirement stay satisfied; a cleanup job
 * (future cron) performs the hard delete after that deadline.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, email: true, deletedAt: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.deletedAt) {
    return NextResponse.json({ alreadyDeleted: true });
  }

  const now = new Date();
  const hardDeleteAt = new Date(
    now.getTime() + HARD_DELETE_DELAY_DAYS * 24 * 60 * 60 * 1000,
  );

  // Collect the file paths to purge from the private bucket BEFORE
  // cascading / modifying rows, so we don't lose the references.
  const ownedReports = await prisma.medicalReport.findMany({
    where: { patientId: me.id },
    select: { fileUrl: true },
  });
  const storagePaths = ownedReports.map((r) => r.fileUrl).filter(Boolean);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: me.id },
      data: { deletedAt: now },
    }),
    // Revoke outstanding permissions on the patient's own reports, so
    // any DOCTOR/COACH loses read access right now. Rows are retained
    // for the audit trail.
    prisma.reportPermission.updateMany({
      where: {
        report: { patientId: me.id },
        revokedAt: null,
      },
      data: { revokedAt: now },
    }),
    // Archive CareRelationships where the caller is the patient.
    prisma.careRelationship.updateMany({
      where: { patientId: me.id, status: "ACTIVE" },
      data: { status: "ARCHIVED", endDate: now },
    }),
  ]);

  // Fire-and-forget bucket cleanup — the admin client deletes the
  // ciphertext; the DB row is kept until the hard delete cron runs.
  if (storagePaths.length > 0) {
    try {
      const admin = createAdminClient();
      await admin.storage
        .from(MEDICAL_REPORTS_BUCKET)
        .remove(storagePaths);
    } catch (err) {
      console.warn("[me-delete] bucket purge failed", err);
    }
  }

  await logAudit({
    actorId: me.id,
    action: "USER_SOFT_DELETE",
    entityType: "User",
    entityId: me.id,
    metadata: {
      hardDeleteAt: hardDeleteAt.toISOString(),
      revokedPermissionsOnOwnReports: true,
      archivedCareRelationships: true,
      purgedStoragePaths: storagePaths.length,
    },
    request: req,
  });

  return NextResponse.json({
    softDeleted: true,
    hardDeleteAt: hardDeleteAt.toISOString(),
  });
}
