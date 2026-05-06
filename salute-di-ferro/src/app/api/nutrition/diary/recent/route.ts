import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";

/**
 * GET /api/nutrition/diary/recent
 *
 * Returns the patient's most-frequent diary entries from the last 90 days,
 * deduplicated by case-folded description. The macros come from the most
 * recent occurrence so the patient can re-add a familiar food as a
 * one-click template — no rescaling, since we don't store per-100g.
 */
const LOOKBACK_DAYS = 90;
const MAX_RESULTS = 20;
const SCAN_LIMIT = 200;

export type RecentFood = {
  description: string;
  caloriesKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  freq: number;
};

export async function GET() {
  try {
    const me = await requireRole(["PATIENT"]);
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const rows = await prisma.nutritionDiaryEntry.findMany({
      where: { patientId: me.id, consumedAt: { gte: since } },
      orderBy: { consumedAt: "desc" },
      take: SCAN_LIMIT,
      select: {
        description: true,
        caloriesKcal: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
      },
    });

    type Bucket = { description: string; freq: number; sample: (typeof rows)[number] };
    const buckets = new Map<string, Bucket>();
    for (const r of rows) {
      const key = r.description.trim().toLowerCase();
      if (!key) continue;
      const existing = buckets.get(key);
      if (existing) {
        existing.freq += 1;
      } else {
        buckets.set(key, { description: r.description.trim(), freq: 1, sample: r });
      }
    }

    const list: RecentFood[] = Array.from(buckets.values())
      .sort((a, b) => b.freq - a.freq)
      .slice(0, MAX_RESULTS)
      .map((b) => ({
        description: b.description,
        caloriesKcal: b.sample.caloriesKcal,
        proteinG: b.sample.proteinG,
        carbsG: b.sample.carbsG,
        fatG: b.sample.fatG,
        freq: b.freq,
      }));

    return NextResponse.json(list);
  } catch (e) {
    return errorResponse(e);
  }
}
