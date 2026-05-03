import type { Sex } from "@prisma/client";

/**
 * Per-site skinfold thresholds (mm), traffic-light banding.
 *
 * `green`  ≤ greenMax  → competition-lean
 * yellow   ≤ yellowMax → average / "meh"
 * `red`    >  yellowMax → obese / overfat
 *
 * Calibrated from:
 *   • Jackson–Pollock 7-site sum norms — male Excellent 24–57 mm,
 *     Average 97–140, Poor 177+; female Excellent 37–67, Average
 *     109–151, Poor 188+ (TrainerMetrics / topendsports).
 *   • Athlete-population skinfold percentiles (Santos et al. 2014):
 *     male athletes 50th percentile 4.6–7.0 mm/site, 90th percentile
 *     13.5 mm at small sites (triceps/subscapular/calf) and 18–25 mm
 *     at suprailiac/abdominal/thigh; female athletes 50th percentile
 *     12.0–15.4 mm at triceps/suprailiac/abdominal/calf.
 *   • Site-specific sex distribution: women carry meaningfully more
 *     fat at thigh, triceps and suprailiac than men.
 * Tweak in this file as you collect real-world calibration.
 */

export const SKINFOLD_SITES = [
  "chestSkinfoldMm",
  "abdominalSkinfoldMm",
  "thighSkinfoldMm",
  "suprailiacSkinfoldMm",
  "subscapularSkinfoldMm",
  "midaxillarySkinfoldMm",
  "tricepsSkinfoldMm",
  "calfSkinfoldMm",
] as const;

export type SkinfoldSite = (typeof SKINFOLD_SITES)[number];

export const SKINFOLD_LABELS: Record<SkinfoldSite, string> = {
  chestSkinfoldMm: "Pettorale",
  abdominalSkinfoldMm: "Addominale",
  thighSkinfoldMm: "Coscia",
  suprailiacSkinfoldMm: "Soprailiaca",
  subscapularSkinfoldMm: "Sottoscapolare",
  midaxillarySkinfoldMm: "Ascellare",
  tricepsSkinfoldMm: "Tricipite",
  calfSkinfoldMm: "Polpaccio",
};

type Band = { greenMax: number; yellowMax: number };

const MALE: Record<SkinfoldSite, Band> = {
  chestSkinfoldMm: { greenMax: 6, yellowMax: 14 },
  abdominalSkinfoldMm: { greenMax: 10, yellowMax: 25 },
  thighSkinfoldMm: { greenMax: 8, yellowMax: 22 },
  suprailiacSkinfoldMm: { greenMax: 8, yellowMax: 20 },
  subscapularSkinfoldMm: { greenMax: 8, yellowMax: 16 },
  midaxillarySkinfoldMm: { greenMax: 7, yellowMax: 16 },
  tricepsSkinfoldMm: { greenMax: 7, yellowMax: 14 },
  calfSkinfoldMm: { greenMax: 6, yellowMax: 14 },
};

const FEMALE: Record<SkinfoldSite, Band> = {
  chestSkinfoldMm: { greenMax: 8, yellowMax: 16 },
  abdominalSkinfoldMm: { greenMax: 14, yellowMax: 30 },
  thighSkinfoldMm: { greenMax: 16, yellowMax: 32 },
  suprailiacSkinfoldMm: { greenMax: 12, yellowMax: 24 },
  subscapularSkinfoldMm: { greenMax: 11, yellowMax: 22 },
  midaxillarySkinfoldMm: { greenMax: 11, yellowMax: 22 },
  tricepsSkinfoldMm: { greenMax: 12, yellowMax: 24 },
  calfSkinfoldMm: { greenMax: 12, yellowMax: 24 },
};

export type SkinfoldGrade = "green" | "yellow" | "red";

export function gradeSkinfold(
  site: SkinfoldSite,
  value: number,
  sex: Sex | null,
): SkinfoldGrade | null {
  // Without sex we can't pick a band — show neutrally rather than guess.
  if (!sex) return null;
  const table = sex === "FEMALE" ? FEMALE : MALE;
  const band = table[site];
  if (!band) return null;
  if (value <= band.greenMax) return "green";
  if (value <= band.yellowMax) return "yellow";
  return "red";
}

export const SKINFOLD_GRADE_LABELS: Record<SkinfoldGrade, string> = {
  green: "Tirato",
  yellow: "Medio",
  red: "Sopra soglia",
};
