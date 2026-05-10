/**
 * Food search — shared types and relevance scoring used by the API
 * route serving the patient diary picker.
 *
 * Background: until early 2026 the picker proxied Open Food Facts; we
 * dropped that integration in favour of a curated Italian dataset
 * (CREA/INRAN composition tables, ~900 rows) seeded into the `Food`
 * table. The relevance scoring below was originally written to re-rank
 * OFF's noisy results and stayed because it's still the right tool: a
 * raw `ILIKE %q%` query returns rows in insertion order, but we want
 * "pasta" to surface "Pasta di semola, cruda" before "Crema di pasta".
 */

export type FoodSearchResult = {
  /** Stable id — the dataset's natural code (CREA/INRAN food_code). */
  id: string;
  name: string;
  /**
   * Always `null` for the local dataset (these are generic foods, not
   * branded products). Kept in the shape so the picker UI — which still
   * renders an optional brand line — does not need to branch.
   */
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  /** Standard serving in grams from the dataset (`portion`). */
  servingG: number | null;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score a candidate row against the user's query. Tokens of length < 2
 * are ignored (typing "a" is not a real search). Multi-word queries
 * score per token and average; if any token is absent from every field
 * the row is rejected (returns 0).
 *
 * Score: exact > prefix > whole-word > substring. Categories score like
 * a name word match so generic-category queries ("verdura", "legumi")
 * rank with typed-it-in-the-name results — important here because the
 * dataset's category labels are the only way to retrieve a whole class
 * of foods (e.g. "Frutta" → all fruits) without typing 19 different
 * names.
 */
export function relevanceScore(
  name: string,
  englishName: string | null,
  category: string,
  query: string,
): number {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return 0;
  const n = name.toLowerCase();
  const e = (englishName ?? "").toLowerCase();
  const c = category.toLowerCase();
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
    if (word.test(e)) s = Math.max(s, 40);
    else if (e.includes(t)) s = Math.max(s, 15);
    if (s === 0) return 0;
    total += s;
  }
  return total / tokens.length;
}

/** Normalize a query string — case-folded, collapsed whitespace. */
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}
