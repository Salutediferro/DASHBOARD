import type { MetricField } from "@/components/health/metric-form";
import { METRIC_GLOSSARY } from "@/lib/health/metric-glossary";

// Health-page categories shown in the tabs and in the "Aggiungi
// rilevazione" form. Lives outside `health-tabs.tsx` so it can be
// shared with the dashboard's add-biometric dialog without dragging
// the entire HealthTabs tree along.

export const CATEGORIES = [
  { key: "body", label: "Corporei" },
  { key: "circumferences", label: "Circonferenze" },
  { key: "skinfolds", label: "Plicometrie" },
  { key: "cardiovascular", label: "Cardiovascolare" },
  { key: "metabolic", label: "Metabolica" },
  { key: "sleep", label: "Sonno" },
  { key: "activity", label: "Attività" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

// Min/max here MUST mirror the server-side Zod ranges in
// `src/lib/validators/biometric.ts`. Before we carried them through to
// the UI, the user could type SpO2=32 / quality=24 / BP=5, the form
// sent it, and Prisma → Zod rejected it with a generic "Errore
// salvataggio". Keeping the limits co-located with the labels lets the
// browser reject absurd values up front.
export const FIELDS: Record<CategoryKey, MetricField[]> = {
  body: [
    {
      name: "weight",
      label: "Peso",
      unit: "kg",
      step: "0.1",
      placeholder: "75.0",
      min: 20,
      max: 300,
    },
    { name: "bodyFatPercentage", label: "% grasso", unit: "%", step: "0.1", min: 3, max: 60 },
    { name: "muscleMassKg", label: "Massa muscolare", unit: "kg", step: "0.1", min: 10, max: 120 },
    { name: "bodyWaterPct", label: "Acqua corporea", unit: "%", step: "0.1", min: 20, max: 80 },
  ],
  circumferences: [
    { name: "waistCm", label: "Vita", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "hipsCm", label: "Fianchi", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "chestCm", label: "Petto", unit: "cm", step: "0.5", min: 30, max: 200 },
    { name: "armsCm", label: "Braccia", unit: "cm", step: "0.5", min: 10, max: 80 },
    { name: "thighCm", label: "Coscia", unit: "cm", step: "0.5", min: 20, max: 120 },
    { name: "calvesCm", label: "Polpaccio", unit: "cm", step: "0.5", min: 15, max: 80 },
  ],
  skinfolds: [
    { name: "chestSkinfoldMm", label: "Pettorale", unit: "mm", step: "0.5", min: 1, max: 80 },
    { name: "abdominalSkinfoldMm", label: "Addominale", unit: "mm", step: "0.5", min: 1, max: 80 },
    { name: "thighSkinfoldMm", label: "Coscia", unit: "mm", step: "0.5", min: 1, max: 80 },
    {
      name: "suprailiacSkinfoldMm",
      label: "Soprailiaca",
      unit: "mm",
      step: "0.5",
      min: 1,
      max: 80,
    },
    {
      name: "subscapularSkinfoldMm",
      label: "Sottoscapolare",
      unit: "mm",
      step: "0.5",
      min: 1,
      max: 80,
    },
    { name: "midaxillarySkinfoldMm", label: "Ascellare", unit: "mm", step: "0.5", min: 1, max: 80 },
    { name: "tricepsSkinfoldMm", label: "Tricipite", unit: "mm", step: "0.5", min: 1, max: 80 },
    { name: "calfSkinfoldMm", label: "Polpaccio", unit: "mm", step: "0.5", min: 1, max: 80 },
  ],
  cardiovascular: [
    { name: "systolicBP", label: "PA sistolica", unit: "mmHg", step: "1", min: 60, max: 260 },
    { name: "diastolicBP", label: "PA diastolica", unit: "mmHg", step: "1", min: 30, max: 160 },
    { name: "restingHR", label: "FC riposo", unit: "bpm", step: "1", min: 25, max: 220 },
    { name: "spo2", label: "SpO2", unit: "%", step: "0.1", min: 50, max: 100 },
    { name: "hrv", label: "HRV", unit: "ms", step: "1", min: 0, max: 300 },
  ],
  metabolic: [
    {
      name: "glucoseFasting",
      label: "Glicemia digiuno",
      unit: "mg/dL",
      step: "1",
      min: 30,
      max: 500,
    },
    {
      name: "glucosePostMeal",
      label: "Glicemia post-pasto",
      unit: "mg/dL",
      step: "1",
      min: 30,
      max: 600,
    },
    { name: "ketones", label: "Chetoni", unit: "mmol/L", step: "0.1", min: 0, max: 10 },
    { name: "bodyTempC", label: "Temperatura", unit: "°C", step: "0.1", min: 30, max: 45 },
  ],
  sleep: [
    { name: "sleepBedtime", label: "A letto", type: "time", placeholder: "23:30" },
    { name: "sleepWakeTime", label: "Sveglia", type: "time", placeholder: "07:00" },
    {
      name: "sleepHours",
      label: "Ore dormite",
      unit: "h",
      step: "0.25",
      min: 0,
      max: 16,
      hint: "Calcolate automaticamente da 'A letto' e 'Sveglia', oppure inseriscile a mano.",
    },
    { name: "sleepQuality", label: "Qualità (1-10)", step: "1", min: 1, max: 10 },
    { name: "sleepAwakenings", label: "Risvegli", step: "1", min: 0, max: 20 },
  ],
  activity: [
    { name: "steps", label: "Passi", step: "1", min: 0, max: 100000 },
    { name: "caloriesBurned", label: "Kcal bruciate", step: "1", min: 0, max: 10000 },
    { name: "activeMinutes", label: "Minuti attivi", unit: "min", step: "1", min: 0, max: 1440 },
    { name: "distanceKm", label: "Distanza", unit: "km", step: "0.1", min: 0, max: 200 },
  ],
};

// Augment each field with the "how/when to measure" hint from the
// glossary, so the rilevazione form shows a small grey note under the
// input ("Pressione dopo 5–15 min di riposo, …"). Explicit per-field
// hints (e.g. sleepHours' auto-fill note) win — only fields without
// an existing hint pull from the glossary.
for (const c of CATEGORIES) {
  FIELDS[c.key] = FIELDS[c.key].map((f) =>
    f.hint != null ? f : { ...f, hint: METRIC_GLOSSARY[f.name]?.measure },
  );
}
