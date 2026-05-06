import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";

/**
 * GET /api/nutrition/plans/authored
 *
 * DOCTOR-only. Returns one row per patient the caller has authored at
 * least one plan for. The doctor's nutrition dashboard renders this as
 * a list of "patients I've prepared a plan for", with the most-recent
 * plan summary inline so the caller can jump straight to edit. We pick
 * the most recent plan (active first, else most recently archived) per
 * patient via a per-patient findFirst, since a patient may have a long
 * archived history.
 */
export async function GET() {
  try {
    const me = await requireRole(["DOCTOR"]);

    // Distinct patientIds the doctor has authored a plan for.
    const patients = await prisma.nutritionPlan.findMany({
      where: { authorId: me.id },
      distinct: ["patientId"],
      select: { patientId: true },
    });

    if (patients.length === 0) return NextResponse.json([]);

    const rows = await Promise.all(
      patients.map(async ({ patientId }) => {
        const [latest, patient] = await Promise.all([
          prisma.nutritionPlan.findFirst({
            where: { authorId: me.id, patientId },
            orderBy: [
              { archivedAt: { sort: "desc", nulls: "first" } },
              { createdAt: "desc" },
            ],
            select: {
              id: true,
              title: true,
              archivedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          prisma.user.findUnique({
            where: { id: patientId },
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          }),
        ]);
        return patient && latest
          ? { patient, latestPlan: latest }
          : null;
      }),
    );

    return NextResponse.json(
      rows
        .filter((r): r is NonNullable<typeof r> => r != null)
        .sort((a, b) => {
          // Patients with an active plan first; then by latestPlan.updatedAt
          const aActive = a.latestPlan.archivedAt == null ? 1 : 0;
          const bActive = b.latestPlan.archivedAt == null ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return (
            new Date(b.latestPlan.updatedAt).getTime() -
            new Date(a.latestPlan.updatedAt).getTime()
          );
        }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
