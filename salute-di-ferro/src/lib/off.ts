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

// Use the legacy `cgi/search.pl` endpoint instead of `api/v2/search`.
// Why: `api/v2/search` is primarily a tag/facet filter and treats
// `search_terms` as a loose hint that's easily overridden by sort
// options; with `sort_by=unique_scans_n` it returned the globally most
// popular Italy-market products regardless of relevance ("pollo" → water,
// Coca-Cola, Lindt). The legacy endpoint with `search_simple=1` does
// proper full-text matching, returns results sorted by relevance, and
// is the path OFF's own UI uses. We also drop `cc=it` here — it
// excluded most generic chicken/pasta entries; `lc=it` alone keeps
// product names localized when available.
export const OFF_SEARCH_BASE = "https://world.openfoodfacts.org/cgi/search.pl";

const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_it",
  "brands",
  "nutriments",
  "serving_quantity",
  // Categories matter for category-style queries: typing "pasta" must
  // match "Penne Rigate Barilla" whose category is `en:pastas` even
  // though the product name never says "pasta".
  "categories",
  "categories_tags",
].join(",");

export function buildOffSearchUrl(query: string): string {
  const url = new URL(OFF_SEARCH_BASE);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("fields", OFF_FIELDS);
  // Pull a wider page so we can re-rank locally and still end up with
  // ~20 relevant results after dropping the noise OFF returns.
  url.searchParams.set("page_size", "60");
  url.searchParams.set("lc", "it");
  // No sort_by — let OFF rank by relevance to `search_terms`.
  // No cc=it — too restrictive for generic / cross-market foods.
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
 * with no token match anywhere (name/brand/categories).
 *
 * Categories are critical: generic Italian products (e.g. "Penne Rigate
 * Barilla") never carry the category word in the product name, so a
 * category-style query like "pasta" or "verdura" would otherwise return
 * nothing. We pull both `categories` (localized text) and the stems of
 * `categories_tags` (English slugs, plural-aware via `\b<token>` regex
 * matching "pasta" inside "pastas") so cross-language category matching
 * works.
 *
 * Score: exact > prefix > whole-word > substring; category whole-word
 * match scores like a name word match so generic-category queries can
 * rank with typed-it-in-the-name results. Multi-word queries score per
 * token and average; any token absent from every field rejects the row.
 */
export function relevanceScore(
  name: string,
  brand: string | null,
  categoriesText: string,
  query: string,
): number {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return 0;
  const n = name.toLowerCase();
  const b = (brand ?? "").toLowerCase();
  const c = categoriesText; // already lowercased upstream
  let total = 0;
  for (const t of tokens) {
    const word = new RegExp(`\\b${escapeRegex(t)}`, "i");
    let s = 0;
    if (n === t) s = Math.max(s, 100);
    else if (n.startsWith(t + " ") || n.startsWith(t + ",")) s = Math.max(s, 80);
    else if (word.test(n)) s = Math.max(s, 60);
    else if (n.includes(t)) s = Math.max(s, 30);
    if (word.test(c)) s = Math.max(s, 70);
    else if (c.includes(t)) s = Math.max(s, 25);
    if (b.includes(t)) s = Math.max(s, 10);
    if (s === 0) return 0;
    total += s;
  }
  return total / tokens.length;
}

type NormalizedProduct = {
  result: FoodSearchResult;
  /** Lowercased localized categories + English tag stems, space-joined. */
  categoriesText: string;
};

function buildCategoriesText(p: Record<string, unknown>): string {
  const localized = asString(p.categories) ?? "";
  const tagsRaw = Array.isArray(p.categories_tags) ? p.categories_tags : [];
  // `en:dry-pastas` → `dry pastas`; we keep stems space-joined so a
  // \b<token> regex hits "pasta" inside "pastas".
  const stems = tagsRaw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " "))
    .join(" ");
  return `${localized} ${stems}`.toLowerCase();
}

function normalizeProduct(product: unknown): NormalizedProduct | null {
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
    result: {
      id: asString(p.code) ?? name,
      name,
      brand,
      kcalPer100g: Math.round(kcal),
      proteinPer100g: asNumber(nutriments.proteins_100g),
      carbsPer100g: asNumber(nutriments.carbohydrates_100g),
      fatPer100g: asNumber(nutriments.fat_100g),
      servingG: asNumber(p.serving_quantity),
    },
    categoriesText: buildCategoriesText(p),
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
    .filter((n): n is NormalizedProduct => n != null);

  return normalized
    .map((n, i) => ({
      result: n.result,
      score: relevanceScore(n.result.name, n.result.brand, n.categoriesText, query),
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
