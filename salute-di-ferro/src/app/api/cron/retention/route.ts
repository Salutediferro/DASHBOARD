import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createAdminClient,
  MEDICAL_REPORTS_BUCKET,
} from "@/lib/supabase/admin";

/**
 * GET /api/cron/retention
 *
 * Daily retention/purge job. Implements the schedule documented in
 * docs/compliance/data-retention.md. Safe to re-run — every operation
 * is idempotent at the row level.
 *
 * Actions:
 *   1. Hard-delete User rows soft-deleted more than 30 days ago
 *      (also purges any residual medical-reports bucket files before
 *      the cascade, so the storage doesn't keep orphan blobs).
 *   2. Delete Notifications older than 365 days.
 *   3. Delete Invitations in terminal states (EXPIRED / USED / REVOKED)
 *      older than 90 days.
 *
 * AuditLog is NOT touched here — retention on the audit trail is 5y
 * per policy, and the DPO may opt to keep it longer for forensics.
 * When that decision is formalized, add a branch gated by env.
 *
 * Auth: shared secret in Authorization header. Vercel Cron signs the
 * request automatically when CRON_SECRET is set.
 */
export const dynamic = "force-dynamic";

const HARD_DELETE_DELAY_DAYS = 30;
const NOTIFICATION_RETENTION_DAYS = 365;
const INVITATION_CLEANUP_DAYS = 90;

type RunResult = {
  ok: boolean;
  timestamp: string;
  usersHardDeleted: number;
  usersSkipped: Array<{ id: string; reason: string }>;
  notificationsDeleted: number;
  invitationsDeleted: number;
  storageBlobsPurged: number;
  storageErrors: string[];
};

async function purgeUserStorage(
  patientId: string,
): Promise<{ purged: number; error: string | null }> {
  // Collect any residual file paths owned by this patient before the
  // DB cascade drops the rows we need to enumerate.
  const reports = await prisma.medicalReport.findMany({
    where: { patientId },
    select: { fileUrl: true },
  });
  const paths = reports.map((r) => r.fileUrl).filter(Boolean);
  if (paths.length === 0) return { purged: 0, error: null };
  try {
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(MEDICAL_REPORTS_BUCKET)
      .remove(paths);
    if (error) return { purged: 0, error: error.message };
    return { purged: paths.length, error: null };
  } catch (e) {
    return {
      purged: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result: RunResult = {
    ok: true,
    timestamp: now.toISOString(),
    usersHardDeleted: 0,
    usersSkipped: [],
    notificationsDeleted: 0,
    invitationsDeleted: 0,
    storageBlobsPurged: 0,
    storageErrors: [],
  };

  // ── 1) Hard-delete users soft-deleted more than N days ago ─────────
  const userCutoff = new Date(
    now.getTime() - HARD_DELETE_DELAY_DAYS * 86400_000,
  );
  const candidates = await prisma.user.findMany({
    where: { deletedAt: { not: null, lt: userCutoff } },
    select: { id: true, role: true, email: true },
  });

  for (const u of candidates) {
    // Clean up the private bucket first — once `prisma.user.delete`
    // cascades, we lose the list of paths to remove.
    const { purged, error: storageError } = await purgeUserStorage(u.id);
    result.storageBlobsPurged += purged;
    if (storageError) {
      result.storageErrors.push(`${u.id}: ${storageError}`);
    }

    try {
      await prisma.user.delete({ where: { id: u.id } });
      result.usersHardDeleted++;
    } catch (e) {
      // Most likely cause: FK Restrict on MedicalReport.uploadedBy —
      // i.e. a professional who uploaded reports on behalf of
      // patients who are still active. We can't auto-delete safely;
      // surface for manual review.
      result.usersSkipped.push({
        id: u.id,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── 2) Delete old notifications ────────────────────────────────────
  const notifCutoff = new Date(
    now.getTime() - NOTIFICATION_RETENTION_DAYS * 86400_000,
  );
  const notifResult = await prisma.notification.deleteMany({
    where: { createdAt: { lt: notifCutoff } },
  });
  result.notificationsDeleted = notifResult.count;

  // ── 3) Delete old terminal invitations ─────────────────────────────
  const inviteCutoff = new Date(
    now.getTime() - INVITATION_CLEANUP_DAYS * 86400_000,
  );
  const inviteResult = await prisma.invitation.deleteMany({
    where: {
      status: { in: ["EXPIRED", "ACCEPTED", "REVOKED"] },
      OR: [
        { usedAt: { lt: inviteCutoff } },
        // Fallback for rows whose status became terminal without
        // setting usedAt (e.g. REVOKED): use createdAt + grace.
        { usedAt: null, createdAt: { lt: inviteCutoff } },
      ],
    },
  });
  result.invitationsDeleted = inviteResult.count;

  return NextResponse.json(result);
}
