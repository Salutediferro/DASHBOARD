import { NextResponse } from "next/server";

import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import {
  normalizeQuery,
  relevanceScore,
  type FoodSearchResult,
} from "@/lib/food-search";

/**
 * Free-text food search backing the patient diary picker.
 *
 * Pre-2026 this proxied Open Food Facts (with Redis caching and a
 * browser-side fallback for rate-limit handoff). We replaced it with a
 * curated local dataset — the Italian CREA/INRAN composition tables
 * (~900 rows) seeded into the `Food` table by `npm run db:seed:foods`.
 * No external calls, no quota games, no cache: a 900-row Postgres ILIKE
 * scan is comfortably sub-millisecond and the read load is negligible.
 *
 * Strategy:
 *   1. Broad recall — pull every row where ANY query token appears in
 *      `name`, `englishName`, or `category` (case-insensitive). With a
 *      900-row table the candidate set is small even for short tokens.
 *   2. In-memory ranking via `relevanceScore` — exact > prefix > whole
 *      word > substring, with category matches scored like name word
 *      hits so a query like "frutta" surfaces every fruit. Tokens
 *      missing from every field reject the row.
 *   3. Top 20.
 */

const MAX_RESULTS = 20;

export async function GET(req: Request) {
  try {
    await requireRole(["PATIENT"]);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json([]);

    // Tokens >= 2 chars only; one-letter tokens balloon the candidate
    // set without adding signal (they match every "a"/"e" in Italian).
    const tokens = normalizeQuery(q).split(" ").filter((t) => t.length >= 2);
    if (tokens.length === 0) return NextResponse.json([]);

    // OR across tokens for recall — `relevanceScore` does the strict
    // AND-style filter (rows missing any token in every field score 0
    // and get dropped). Keeping the SQL permissive avoids the trap
    // where a multi-token query returns nothing because no single row
    // contains every token in one field.
    const candidates = await prisma.food.findMany({
      where: {
        OR: tokens.flatMap((t) => [
          { name: { contains: t, mode: "insensitive" as const } },
          { englishName: { contains: t, mode: "insensitive" as const } },
          { category: { contains: t, mode: "insensitive" as const } },
        ]),
      },
      // Cap the candidate set so a one-letter common token (e.g. typing
      // a token that ends up matching half the table) never pulls back
      // more rows than we'd ever rank. 200 is well above MAX_RESULTS so
      // ranking always has room to find the best 20.
      take: 200,
    });

    const ranked = candidates
      .map((c) => ({
        result: {
          id: c.foodCode,
          name: c.name,
          brand: null,
          kcalPer100g: c.kcalPer100g,
          proteinPer100g: c.proteinPer100g,
          carbsPer100g: c.carbsPer100g,
          fatPer100g: c.fatPer100g,
          servingG: c.portionG,
        } satisfies FoodSearchResult,
        score: relevanceScore(c.name, c.englishName, c.category, q),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.result.name.localeCompare(b.result.name))
      .slice(0, MAX_RESULTS)
      .map((x) => x.result);

    return NextResponse.json(ranked);
  } catch (e) {
    return errorResponse(e);
  }
}
