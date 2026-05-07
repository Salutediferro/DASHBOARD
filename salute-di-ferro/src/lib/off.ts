/**
 * Open Food Facts (OFF) shared client — used by both the server proxy
 * route and the browser fallback in `useFoodSearch`. Keeping the URL
 * shape, normalization and relevance scoring in one place means cache
 * keys and ranking stay identical no matter which side issued the call.
 *
 * The browser fallback exists because OFF rate-limits searches at
 * 10 req/min/IP. Our server proxy uses a single shared egress IP, so
 * under load the patient base shares one quota; on rate-limit we let
 * the browser hit OFF directly so each user gets their own.
 */

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

export const OFF_SEARCH_BASE = "https://world.openfoodfacts.org/api/v2/search";

const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_it",
  "brands",
  "nutriments",
  "serving_quantity",
].join(",");

export function buildOffSearchUrl(query: string): string {
  const url = new URL(OFF_SEARCH_BASE);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("fields", OFF_FIELDS);
  // Pull a wider page so we can re-rank locally and still end up with
  // ~20 relevant results after dropping the noise OFF returns.
  url.searchParams.set("page_size", "60");
  url.searchParams.set("lc", "it");
  url.searchParams.set("cc", "it");
  url.searchParams.set("sort_by", "unique_scans_n");
  return url.toString();
}

function asNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * OFF's `search_terms` is fuzzy and ranks by popularity, so for a query
 * like "pasta" it surfaces sauces, ready-meals and random products that
 * mention pasta anywhere in the metadata. We re-rank locally so results
 * the user actually typed the name of float to the top, and drop entries
 * with no token match against name/brand at all.
 *
 * Score: exact > prefix > whole-word > substring > brand-only.
 * Multi-word queries score per token and average.
 */
export function relevanceScore(name: string, brand: string | null, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return 0;
  const n = name.toLowerCase();
  const b = (brand ?? "").toLowerCase();
  let total = 0;
  for (const t of tokens) {
    const word = new RegExp(`\\b${escapeRegex(t)}`, "i");
    if (n === t) total += 100;
    else if (n.startsWith(t + " ") || n.startsWith(t + ",")) total += 80;
    else if (word.test(n)) total += 60;
    else if (n.includes(t)) total += 30;
    else if (b.includes(t)) total += 10;
    else return 0; // any token absent from both name and brand → reject
  }
  return total / tokens.length;
}

function normalizeProduct(product: unknown): FoodSearchResult | null {
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

/**
 * Take a raw `/api/v2/search` JSON body and return the top 20 normalized
 * results scored against `query`, popularity-tiebroken.
 */
export function parseOffSearchResponse(data: unknown, query: string): FoodSearchResult[] {
  const products =
    data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)
      ? (data as { products: unknown[] }).products
      : [];

  const normalized = products
    .map(normalizeProduct)
    .filter((r): r is FoodSearchResult => r != null);

  return normalized
    .map((r, i) => ({
      result: r,
      score: relevanceScore(r.name, r.brand, query),
      // Preserve OFF's popularity order as a tiebreaker.
      popularity: -i,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, 20)
    .map((x) => x.result);
}

/** Normalize a query string for use as a cache key — case-folded, collapsed whitespace. */
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}
