import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { planCreateSchema } from "@/lib/validators/nutrition";

const PLAN_SELECT = {
  id: true,
  patientId: true,
  authorId: true,
  title: true,
  notes: true,
  targetCaloriesKcal: true,
  targetProteinG: true,
  targetCarbsG: true,
  targetFatG: true,
  meals: true,
  startDate: true,
  endDate: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, fullName: true, avatarUrl: true, specialties: true },
  },
} satisfies Prisma.NutritionPlanSelect;

/**
 * GET /api/nutrition/plans?patientId=<uuid>
 *
 * History of plans for a given patient (active first, then archived,
 * each newest-first). Patients can only read their own; DOCTOR/COACH
 * must have an ACTIVE CareRelationship; ADMIN can read any.
 */
export async function GET(req: Request) {
  try {
    const me = await requireRole(["PATIENT", "DOCTOR", "COACH", "ADMIN"]);
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId") ?? me.id;

    if (me.role === "PATIENT" && patientId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (me.role === "DOCTOR" || me.role === "COACH") {
      const rel = await prisma.careRelationship.findFirst({
        where: {
          professionalId: me.id,
          patientId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!rel) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const plans = await prisma.nutritionPlan.findMany({
      where: { patientId },
      orderBy: [
        // Active (archivedAt IS NULL) first, then most recently archived.
        { archivedAt: { sort: "desc", nulls: "first" } },
        { createdAt: "desc" },
      ],
      select: PLAN_SELECT,
    });

    return NextResponse.json(plans);
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/nutrition/plans
 *
 * DOCTOR-only. Creates a new plan for a patient the doctor has an ACTIVE
 * CareRelationship with. If the patient already has an active plan, it is
 * archived in the same transaction so the partial unique index on
 * (patientId) WHERE archivedAt IS NULL is never violated.
 */
export async function POST(req: Request) {
  try {
    const me = await requireRole(["DOCTOR"]);
    const body = await req.json();
    const parsed = planCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: data.patientId,
        professionalRole: "DOCTOR",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) {
      return NextResponse.json(
        { error: "Nessuna relazione di cura attiva con questo paziente." },
        { status: 403 },
      );
    }

    const now = new Date();
    const plan = await prisma.$transaction(async (tx) => {
      await tx.nutritionPlan.updateMany({
        where: { patientId: data.patientId, archivedAt: null },
        data: { archivedAt: now },
      });
      return tx.nutritionPlan.create({
        data: {
          patientId: data.patientId,
          authorId: me.id,
          title: data.title,
          notes: data.notes ?? null,
          targetCaloriesKcal: data.targetCaloriesKcal ?? null,
          targetProteinG: data.targetProteinG ?? null,
          targetCarbsG: data.targetCarbsG ?? null,
          targetFatG: data.targetFatG ?? null,
          meals: data.meals as unknown as Prisma.InputJsonValue,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
        select: PLAN_SELECT,
      });
    });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_PLAN_CREATE",
      entityType: "NutritionPlan",
      entityId: plan.id,
      metadata: { patientId: data.patientId },
      request: req,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
