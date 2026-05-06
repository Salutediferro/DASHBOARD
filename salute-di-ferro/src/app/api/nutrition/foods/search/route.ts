import { NextResponse } from "next/server";

import { requireRole, errorResponse } from "@/lib/auth/require-role";

/**
 * Server-side proxy to Open Food Facts (OFF) so the patient diary picker
 * can suggest known foods with macros. We proxy rather than calling from
 * the client to:
 *   1. Send a polite User-Agent (OFF asks for one),
 *   2. Cache identical searches via Next.js fetch revalidate,
 *   3. Return a small, normalized shape regardless of OFF's broader payload.
 *
 * Authentication is required (PATIENT role) — we don't want this acting as
 * an open OFF mirror.
 */

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/search";
const FIELDS = [
  "code",
  "product_name",
  "product_name_it",
  "brands",
  "nutriments",
  "serving_quantity",
].join(",");
const USER_AGENT = "SaluteDiFerro/1.0 (https://salutediferro.it)";

export type FoodSearchResult = {
  /** Stable id — OFF barcode if present, otherwise the name. */
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  /** Standard serving in grams when OFF reports it; null otherwise. */
  servingG: number | null;
};

function asNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function normalize(product: unknown): FoodSearchResult | null {
  if (!product || typeof product !== "object") return null;
  const p = product as Record<string, unknown>;

  const name = asString(p.product_name_it) ?? asString(p.product_name);
  if (!name) return null;

  const nutriments =
    p.nutriments && typeof p.nutriments === "object"
      ? (p.nutriments as Record<string, unknown>)
      : {};

  // OFF stores both `energy-kcal_100g` (preferred) and `energy-kcal`
  // (per serving). We require per-100g so the rescaling math is honest.
  const kcal = asNumber(nutriments["energy-kcal_100g"]);
  if (kcal == null || kcal <= 0) return null;

  const brandsRaw = asString(p.brands);
  const brand = brandsRaw ? (brandsRaw.split(",")[0]?.trim() ?? null) : null;

  return {
    id: asString(p.code) ?? name,
    name,
    brand,
    kcalPer100g: Math.round(kcal),
    proteinPer100g: asNumber(nutriments.proteins_100g),
    carbsPer100g: asNumber(nutriments.carbohydrates_100g),
    fatPer100g: asNumber(nutriments.fat_100g),
    servingG: asNumber(p.serving_quantity),
  };
}

export async function GET(req: Request) {
  try {
    await requireRole(["PATIENT"]);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json([]);

    const offUrl = new URL(OFF_BASE);
    offUrl.searchParams.set("search_terms", q);
    offUrl.searchParams.set("fields", FIELDS);
    offUrl.searchParams.set("page_size", "20");
    offUrl.searchParams.set("lc", "it");
    offUrl.searchParams.set("cc", "it");
    offUrl.searchParams.set("sort_by", "unique_scans_n");

    let res: Response;
    try {
      res = await fetch(offUrl.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        // Cache 1h per unique URL — OFF data is slow-changing and identical
        // searches are common.
        next: { revalidate: 3600 },
      });
    } catch (err) {
      console.warn("[off-search] network error", err);
      return NextResponse.json([]);
    }

    if (!res.ok) {
      console.warn("[off-search] non-ok response", res.status);
      console.warn(await res.text());

      return NextResponse.json([]);
    }

    const data: unknown = await res.json().catch(() => null);
    const products =
      data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)
        ? (data as { products: unknown[] }).products
        : [];

    const results = products
      .map(normalize)
      .filter((r): r is FoodSearchResult => r != null)
      .slice(0, 20);

    return NextResponse.json(results);
  } catch (e) {
    return errorResponse(e);
  }
}
