/**
 * Curated list of common supplements with their typical dose. Drives
 * the autocomplete + dose auto-fill in the supplementi form. The list
 * is intentionally short — easy to scan in a `<datalist>` dropdown and
 * easy to extend when a coach asks for a missing one. Doses follow the
 * label conventions on Italian supplement packaging (mg, mcg, UI,
 * cps = capsule, etc.) so a user recognising the supplement also
 * recognises the dose format.
 *
 * Custom (non-catalog) names are still allowed in the form — the
 * picker matches on exact normalised name, so anything outside this
 * list is treated as user-supplied and requires an explicit dose.
 */

export type CatalogSupplement = {
  name: string;
  /** Default dose pre-filled when the user picks this entry. */
  dose: string;
  /** Used as the `<optgroup>`-equivalent comment in the datalist
   * description so the dropdown reads "Magnesio bisglicinato — 300 mg
   * · minerali". */
  category: string;
};

export const SUPPLEMENT_CATALOG: CatalogSupplement[] = [
  // ── Vitamine ─────────────────────────────────────────────────────
  { name: "Vitamina D3", dose: "2000 UI", category: "vitamine" },
  { name: "Vitamina D3 + K2", dose: "2000 UI / 100 mcg", category: "vitamine" },
  { name: "Vitamina C", dose: "500 mg", category: "vitamine" },
  { name: "Vitamina B12 (metilcobalamina)", dose: "1000 mcg", category: "vitamine" },
  { name: "Vitamina B6", dose: "10 mg", category: "vitamine" },
  { name: "Acido folico (B9)", dose: "400 mcg", category: "vitamine" },
  { name: "Complesso B", dose: "1 cps", category: "vitamine" },
  { name: "Multivitaminico", dose: "1 cps", category: "vitamine" },

  // ── Minerali ─────────────────────────────────────────────────────
  { name: "Magnesio bisglicinato", dose: "300 mg", category: "minerali" },
  { name: "Magnesio citrato", dose: "300 mg", category: "minerali" },
  { name: "Zinco bisglicinato", dose: "15 mg", category: "minerali" },
  { name: "Ferro bisglicinato", dose: "20 mg", category: "minerali" },
  { name: "Calcio", dose: "500 mg", category: "minerali" },
  { name: "Iodio", dose: "150 mcg", category: "minerali" },
  { name: "Selenio", dose: "100 mcg", category: "minerali" },
  { name: "Potassio", dose: "300 mg", category: "minerali" },

  // ── Acidi grassi essenziali ──────────────────────────────────────
  { name: "Omega-3 (EPA + DHA)", dose: "1000 mg", category: "acidi grassi" },
  { name: "Olio di pesce", dose: "1 g", category: "acidi grassi" },
  { name: "Olio di krill", dose: "500 mg", category: "acidi grassi" },

  // ── Performance / pre-workout ────────────────────────────────────
  { name: "Creatina monoidrato", dose: "5 g", category: "performance" },
  { name: "Beta-alanina", dose: "3 g", category: "performance" },
  { name: "Caffeina anidra", dose: "200 mg", category: "performance" },

  // ── Aminoacidi ───────────────────────────────────────────────────
  { name: "BCAA", dose: "10 g", category: "aminoacidi" },
  { name: "EAA", dose: "10 g", category: "aminoacidi" },
  { name: "Glutammina", dose: "5 g", category: "aminoacidi" },

  // ── Proteine in polvere ──────────────────────────────────────────
  { name: "Whey protein", dose: "30 g", category: "proteine" },
  { name: "Caseine", dose: "30 g", category: "proteine" },
  { name: "Proteine vegetali", dose: "30 g", category: "proteine" },

  // ── Sonno & rilassamento ─────────────────────────────────────────
  { name: "Melatonina", dose: "1 mg", category: "sonno" },
  { name: "Valeriana", dose: "300 mg", category: "sonno" },
  { name: "L-Teanina", dose: "200 mg", category: "sonno" },

  // ── Adattogeni / energia ─────────────────────────────────────────
  { name: "Ashwagandha", dose: "600 mg", category: "adattogeni" },
  { name: "Rhodiola rosea", dose: "300 mg", category: "adattogeni" },
  { name: "Ginseng", dose: "200 mg", category: "adattogeni" },

  // ── Intestino / immunità ─────────────────────────────────────────
  { name: "Probiotici", dose: "1 cps", category: "intestino" },
  { name: "Fibra (psillio)", dose: "5 g", category: "intestino" },

  // ── Antiossidanti / antinfiammatori ─────────────────────────────
  { name: "Curcuma + Piperina", dose: "500 mg", category: "antinfiammatori" },
  { name: "Coenzima Q10", dose: "100 mg", category: "antiossidanti" },
  { name: "Resveratrolo", dose: "250 mg", category: "antiossidanti" },
  { name: "N-acetilcisteina (NAC)", dose: "600 mg", category: "antiossidanti" },

  // ── Articolazioni & connettivo ──────────────────────────────────
  {
    name: "Glucosamina + Condroitina",
    dose: "1500 mg / 1200 mg",
    category: "articolazioni",
  },
  { name: "Collagene idrolizzato", dose: "10 g", category: "articolazioni" },
  { name: "MSM", dose: "1500 mg", category: "articolazioni" },
];

/** Case-insensitive exact match on name. */
export function findSupplement(name: string): CatalogSupplement | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return (
    SUPPLEMENT_CATALOG.find((s) => s.name.toLowerCase() === n) ?? null
  );
}

export function isKnownSupplement(name: string): boolean {
  return findSupplement(name) != null;
}
