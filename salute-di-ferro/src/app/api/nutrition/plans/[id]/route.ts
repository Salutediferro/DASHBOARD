import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { planUpdateSchema } from "@/lib/validators/nutrition";

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

type Ctx = { params: Promise<{ id: string }> };

async function loadPlan(id: string) {
  return prisma.nutritionPlan.findUnique({
    where: { id },
    select: PLAN_SELECT,
  });
}

async function canRead(
  me: { id: string; role: string },
  plan: { patientId: string },
): Promise<boolean> {
  if (me.role === "ADMIN") return true;
  if (me.role === "PATIENT") return me.id === plan.patientId;
  if (me.role === "DOCTOR" || me.role === "COACH") {
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: plan.patientId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return rel != null;
  }
  return false;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["PATIENT", "DOCTOR", "COACH", "ADMIN"]);
    const { id } = await params;
    const plan = await loadPlan(id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canRead(me, plan))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(plan);
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PATCH only the original author (DOCTOR who created it). Patient and
 * other professionals are read-only.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["DOCTOR"]);
    const { id } = await params;
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id },
      select: { id: true, authorId: true, archivedAt: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (plan.authorId !== me.id) {
      return NextResponse.json(
        { error: "Solo l'autore può modificare il piano." },
        { status: 403 },
      );
    }
    if (plan.archivedAt) {
      return NextResponse.json(
        { error: "Piano archiviato — non modificabile." },
        { status: 409 },
      );
    }

    const body = await req.json();
    const parsed = planUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const updates: Prisma.NutritionPlanUpdateInput = {};
    if (d.title !== undefined) updates.title = d.title;
    if (d.notes !== undefined) updates.notes = d.notes;
    if (d.targetCaloriesKcal !== undefined)
      updates.targetCaloriesKcal = d.targetCaloriesKcal;
    if (d.targetProteinG !== undefined) updates.targetProteinG = d.targetProteinG;
    if (d.targetCarbsG !== undefined) updates.targetCarbsG = d.targetCarbsG;
    if (d.targetFatG !== undefined) updates.targetFatG = d.targetFatG;
    if (d.meals !== undefined)
      updates.meals = d.meals as unknown as Prisma.InputJsonValue;
    if (d.startDate !== undefined)
      updates.startDate = d.startDate ? new Date(d.startDate) : null;
    if (d.endDate !== undefined)
      updates.endDate = d.endDate ? new Date(d.endDate) : null;

    const updated = await prisma.nutritionPlan.update({
      where: { id },
      data: updates,
      select: PLAN_SELECT,
    });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_PLAN_UPDATE",
      entityType: "NutritionPlan",
      entityId: id,
      metadata: { fields: Object.keys(updates) },
      request: req,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * DELETE archives the plan (sets archivedAt). Only the author can
 * archive. The patient keeps it visible under "Piani precedenti".
 */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["DOCTOR"]);
    const { id } = await params;
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id },
      select: { id: true, authorId: true, archivedAt: true, patientId: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (plan.authorId !== me.id) {
      return NextResponse.json(
        { error: "Solo l'autore può archiviare il piano." },
        { status: 403 },
      );
    }
    if (plan.archivedAt) {
      return NextResponse.json({ ok: true, alreadyArchived: true });
    }

    await prisma.nutritionPlan.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_PLAN_ARCHIVE",
      entityType: "NutritionPlan",
      entityId: id,
      metadata: { patientId: plan.patientId },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
