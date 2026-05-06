import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { diaryEntryUpdateSchema } from "@/lib/validators/nutrition";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH a diary entry (patient-only, must own the row). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["PATIENT"]);
    const { id } = await params;

    const existing = await prisma.nutritionDiaryEntry.findUnique({
      where: { id },
      select: { id: true, patientId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.patientId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = diaryEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const updates: Prisma.NutritionDiaryEntryUpdateInput = {};
    if (d.consumedAt !== undefined) updates.consumedAt = new Date(d.consumedAt);
    if (d.mealSlot !== undefined) updates.mealSlot = d.mealSlot;
    if (d.description !== undefined) updates.description = d.description;
    if (d.caloriesKcal !== undefined) updates.caloriesKcal = d.caloriesKcal;
    if (d.proteinG !== undefined) updates.proteinG = d.proteinG ?? null;
    if (d.carbsG !== undefined) updates.carbsG = d.carbsG ?? null;
    if (d.fatG !== undefined) updates.fatG = d.fatG ?? null;

    const updated = await prisma.nutritionDiaryEntry.update({
      where: { id },
      data: updates,
    });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_DIARY_UPDATE",
      entityType: "NutritionDiaryEntry",
      entityId: id,
      metadata: { fields: Object.keys(updates) },
      request: req,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE a diary entry (patient-only, must own the row). Hard delete. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const me = await requireRole(["PATIENT"]);
    const { id } = await params;

    const existing = await prisma.nutritionDiaryEntry.findUnique({
      where: { id },
      select: { id: true, patientId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.patientId !== me.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.nutritionDiaryEntry.delete({ where: { id } });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_DIARY_DELETE",
      entityType: "NutritionDiaryEntry",
      entityId: id,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
