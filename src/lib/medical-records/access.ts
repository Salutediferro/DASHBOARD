import type { MedicalReport, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Caller = Pick<User, "id" | "role">;

export type AccessCheck =
  | { ok: true; role: "OWNER" | "PROFESSIONAL_WITH_PERMISSION" | "ADMIN" }
  | { ok: false; error: "UNAUTHORIZED" | "NOT_FOUND" | "FORBIDDEN" };

/**
 * Double-check enforced per GDPR Art. 9:
 *   - PATIENT owner: always allowed
 *   - DOCTOR/COACH: require ACTIVE CareRelationship AND an unrevoked
 *     ReportPermission (not expired) for the specific report.
 *   - ADMIN: unrestricted.
 *
 * Returns the matching role and the report row, or a structured error.
 */
export async function checkReportReadAccess(
  caller: Caller,
  reportId: string,
): Promise<
  | {
      ok: true;
      report: MedicalReport;
      role: "OWNER" | "PROFESSIONAL_WITH_PERMISSION" | "ADMIN";
    }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  const report = await prisma.medicalReport.findUnique({
    where: { id: reportId },
  });
  if (!report) return { ok: false, status: 404, error: "Not found" };

  if (report.patientId === caller.id) {
    return { ok: true, report, role: "OWNER" };
  }
  if (caller.role === "ADMIN") {
    return { ok: true, report, role: "ADMIN" };
  }
  if (caller.role !== "DOCTOR" && caller.role !== "COACH") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // 1) Active care relationship between the professional and the patient
  const rel = await prisma.careRelationship.findFirst({
    where: {
      professionalId: caller.id,
      patientId: report.patientId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!rel) return { ok: false, status: 403, error: "Forbidden" };

  // 2) Explicit per-report permission, not revoked, not expired
  const now = new Date();
  const permission = await prisma.reportPermission.findFirst({
    where: {
      reportId: report.id,
      granteeId: caller.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  if (!permission) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, report, role: "PROFESSIONAL_WITH_PERMISSION" };
}

/**
 * GDPR Art. 9 audit log — we don't have a persisted AuditLog model yet
 * (flagged as module debt); for now we emit structured console entries
 * so they land in the Vercel logs / local dev stream. The shape is
 * stable so moving to a DB-backed log later is a drop-in replacement.
 */
export function auditMedicalReportAccess(params: {
  actorId: string;
  actorRole: string;
  reportId: string;
  patientId: string;
  action:
    | "LIST"
    | "VIEW"
    | "DOWNLOAD"
    | "UPLOAD"
    | "DELETE"
    | "UPDATE"
    | "PERMISSION_GRANT"
    | "PERMISSION_REVOKE";
  extra?: Record<string, unknown>;
}) {
  console.log(
    JSON.stringify({
      type: "medical-report-audit",
      timestamp: new Date().toISOString(),
      ...params,
    }),
  );
}

/**
 * Resolve the Prisma User row of the current Supabase session.
 * Returns null if no session or no matching User row.
 */
export async function resolveCaller(supabaseUserId: string): Promise<Caller | null> {
  const me = await prisma.user.findUnique({
    where: { id: supabaseUserId },
    select: { id: true, role: true },
  });
  return me ?? null;
}
