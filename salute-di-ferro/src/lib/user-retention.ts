import { prisma } from "@/lib/prisma";
import {
  createAdminClient,
  MEDICAL_REPORTS_BUCKET,
} from "@/lib/supabase/admin";

/**
 * Removes the user's residual files from the private medical-reports
 * bucket. Must run BEFORE `prisma.user.delete` — once the cascade drops
 * the MedicalReport rows, we lose the fileUrl list we enumerate here.
 *
 * Shared between the nightly retention cron and admin-triggered hard-
 * delete. Returns both the count and any storage error so the caller
 * can surface it in the audit log without aborting the DB delete.
 */
export async function purgeUserStorage(
  userId: string,
): Promise<{ purged: number; error: string | null }> {
  const reports = await prisma.medicalReport.findMany({
    where: { patientId: userId },
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
