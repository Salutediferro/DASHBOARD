import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/nutrition/diary/copy
 *
 * Bulk-copy a patient's existing diary entries from one date onto
 * another, preserving meal slot, description, macros and the time-of-day
 * portion of `consumedAt`. The product hypothesis is that most patients
 * eat the same things most days — so "copy yesterday" is the fastest
 * path to a complete diary.
 *
 * Body:
 *   - sourceDate: YYYY-MM-DD to copy FROM
 *   - targetDate: YYYY-MM-DD to copy ONTO
 *   - entryIds (optional): subset of source entries; omitted = all
 *
 * Returns `{ created: <count> }`. We don't dedupe against existing entries
 * on `targetDate` — the caller (UI) decides whether to delete first or
 * accept duplicates.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateOnly = z.string().regex(DATE_RE, "Formato YYYY-MM-DD richiesto");

const copySchema = z
  .object({
    sourceDate: dateOnly,
    targetDate: dateOnly,
    entryIds: z.array(z.string().uuid()).min(1).max(200).optional(),
  })
  .refine((d) => d.sourceDate !== d.targetDate, {
    message: "Sorgente e destinazione devono essere giorni diversi",
    path: ["targetDate"],
  });

function dayRange(date: string): { gte: Date; lt: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export async function POST(req: Request) {
  try {
    const me = await requireRole(["PATIENT"]);
    const body = await req.json().catch(() => null);
    const parsed = copySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }
    const { sourceDate, targetDate, entryIds } = parsed.data;

    const range = dayRange(sourceDate);
    const sourceEntries = await prisma.nutritionDiaryEntry.findMany({
      where: {
        patientId: me.id,
        consumedAt: { gte: range.gte, lt: range.lt },
        ...(entryIds ? { id: { in: entryIds } } : {}),
      },
      orderBy: { consumedAt: "asc" },
      take: 200,
    });

    if (sourceEntries.length === 0) {
      return NextResponse.json({ created: 0 }, { status: 200 });
    }

    // Rebase each entry's wall-clock time onto the target date. We use
    // UTC components because `consumedAt` was stored that way on create
    // (see diary route) and reading it back the same way preserves the
    // user's original HH:MM regardless of TZ.
    const targetMidnight = new Date(`${targetDate}T00:00:00.000Z`);
    const data = sourceEntries.map((e) => {
      const src = new Date(e.consumedAt);
      const consumedAt = new Date(targetMidnight);
      consumedAt.setUTCHours(
        src.getUTCHours(),
        src.getUTCMinutes(),
        src.getUTCSeconds(),
        0,
      );
      return {
        patientId: me.id,
        consumedAt,
        mealSlot: e.mealSlot,
        description: e.description,
        caloriesKcal: e.caloriesKcal,
        proteinG: e.proteinG,
        carbsG: e.carbsG,
        fatG: e.fatG,
      };
    });

    const result = await prisma.nutritionDiaryEntry.createMany({ data });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_DIARY_COPY",
      entityType: "NutritionDiaryEntry",
      // No single entity — we copied N rows. Use the target date as a
      // human-readable handle so audit consumers can grep by day.
      entityId: targetDate,
      request: req,
      metadata: {
        sourceDate,
        targetDate,
        count: result.count,
        scope: entryIds ? "selected" : "all",
      },
    });

    return NextResponse.json({ created: result.count }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
