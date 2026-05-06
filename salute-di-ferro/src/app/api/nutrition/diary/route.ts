import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { diaryEntryCreateSchema } from "@/lib/validators/nutrition";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD query param into a [start, end) UTC range covering
 * that calendar day. We use UTC bounds rather than the user's tz here:
 * the consumedAt the patient saved is wall-clock-ish ISO; for v1 the
 * UI sticks to the user's locale on read, so a UTC bucket is fine.
 */
function dayRange(date: string): { gte: Date; lt: Date } | null {
  if (!DATE_RE.test(date)) return null;
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

/**
 * GET /api/nutrition/diary?date=YYYY-MM-DD&patientId=<uuid>
 *
 * PATIENT defaults to self. DOCTOR/COACH need an ACTIVE
 * CareRelationship. ADMIN can read any. Without `date`, returns the
 * current day's entries. Returns up to 200 rows per call.
 */
export async function GET(req: Request) {
  try {
    const me = await requireRole(["PATIENT", "DOCTOR", "COACH", "ADMIN"]);
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId") ?? me.id;
    const dateParam = url.searchParams.get("date");

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

    const today = new Date().toISOString().slice(0, 10);
    const range = dayRange(dateParam ?? today);
    if (!range) {
      return NextResponse.json(
        { error: "Formato data YYYY-MM-DD richiesto" },
        { status: 400 },
      );
    }

    const entries = await prisma.nutritionDiaryEntry.findMany({
      where: {
        patientId,
        consumedAt: { gte: range.gte, lt: range.lt },
      },
      orderBy: { consumedAt: "asc" },
      take: 200,
    });

    return NextResponse.json(entries);
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST a new diary entry (patient-only, on their own diary). */
export async function POST(req: Request) {
  try {
    const me = await requireRole(["PATIENT"]);
    const body = await req.json();
    const parsed = diaryEntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const consumedAt = new Date(d.consumedAt);

    const entry = await prisma.nutritionDiaryEntry.create({
      data: {
        patientId: me.id,
        consumedAt,
        mealSlot: d.mealSlot,
        description: d.description,
        caloriesKcal: d.caloriesKcal,
        proteinG: d.proteinG ?? null,
        carbsG: d.carbsG ?? null,
        fatG: d.fatG ?? null,
      },
    });

    await logAudit({
      actorId: me.id,
      action: "NUTRITION_DIARY_CREATE",
      entityType: "NutritionDiaryEntry",
      entityId: entry.id,
      request: req,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
