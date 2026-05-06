/**
 * Curated list of "specialità" shown to a Professionista (DOCTOR role) when
 * filling their profile, and used by patients searching for a professional.
 *
 * Stored in `User.specialties` as a String[] (Postgres text[]). Values are
 * canonical Italian labels; render as tags in the UI. Add new entries here
 * — there is no separate enum or join table in the database.
 *
 * Includes both medical specialties (Albo dei Medici Chirurghi) and adjacent
 * health professions a patient may want to grant access to.
 */
export const PROFESSIONAL_SPECIALTIES = [
  "Cardiologia",
  "Endocrinologia",
  "Osteopatia",
  "Fisioterapia",
  "Nutrizione",
  "Gastroenterologia",
] as const;

export type ProfessionalSpecialty = (typeof PROFESSIONAL_SPECIALTIES)[number];

const SPECIALTY_SET: ReadonlySet<string> = new Set(PROFESSIONAL_SPECIALTIES);

export function isProfessionalSpecialty(v: string): v is ProfessionalSpecialty {
  return SPECIALTY_SET.has(v);
}

/**
 * Filter an arbitrary string array to known specialties, dedup, preserve
 * canonical order. Use when persisting from user input.
 */
export function normalizeSpecialties(values: readonly string[]): ProfessionalSpecialty[] {
  const set = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && isProfessionalSpecialty(v)) set.add(v);
  }
  return PROFESSIONAL_SPECIALTIES.filter((s) => set.has(s));
}
