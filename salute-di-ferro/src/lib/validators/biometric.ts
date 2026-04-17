import { z } from "zod";

// ── primitives ────────────────────────────────────────────────────────────
const nOpt = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().optional();

const iOpt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().optional();

const timeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm richiesto")
  .nullable()
  .optional();

// ── nested input schema (API body) ────────────────────────────────────────
export const biometricInputSchema = z.object({
  /** ISO date / datetime. Defaults to now if omitted. */
  date: z.string().optional(),

  body: z
    .object({
      weight: nOpt(20, 300),
      bodyFatPercentage: nOpt(3, 60),
      muscleMassKg: nOpt(10, 120),
      bodyWaterPct: nOpt(20, 80),
    })
    .optional(),

  circumferences: z
    .object({
      waistCm: nOpt(30, 200),
      hipsCm: nOpt(30, 200),
      chestCm: nOpt(30, 200),
      armsCm: nOpt(10, 80),
      thighCm: nOpt(20, 120),
      calvesCm: nOpt(15, 80),
    })
    .optional(),

  cardiovascular: z
    .object({
      systolicBP: iOpt(60, 260),
      diastolicBP: iOpt(30, 160),
      restingHR: iOpt(25, 220),
      spo2: nOpt(50, 100),
      hrv: nOpt(0, 300),
    })
    .optional(),

  metabolic: z
    .object({
      glucoseFasting: nOpt(30, 500),
      glucosePostMeal: nOpt(30, 600),
      ketones: nOpt(0, 10),
      bodyTempC: nOpt(30, 45),
    })
    .optional(),

  sleep: z
    .object({
      sleepHours: nOpt(0, 16),
      sleepQuality: iOpt(1, 10),
      sleepBedtime: timeHHmm,
      sleepWakeTime: timeHHmm,
      sleepAwakenings: iOpt(0, 20),
    })
    .optional(),

  activity: z
    .object({
      steps: iOpt(0, 100_000),
      caloriesBurned: iOpt(0, 10_000),
      activeMinutes: iOpt(0, 1440),
      distanceKm: nOpt(0, 200),
    })
    .optional(),

  energyLevel: iOpt(1, 10),
  notes: z.string().max(2000).nullable().optional(),
});

export type BiometricInput = z.infer<typeof biometricInputSchema>;

/** Patch shares the same shape — every field is already optional. */
export const biometricPatchSchema = biometricInputSchema;

// ── flatten helper (nested input → Prisma BiometricLog columns) ──────────
/**
 * Flatten the nested API input into the shape Prisma expects. `date`
 * resolves to a JS Date (defaulting to now). Sleep bedtime / wake time
 * "HH:mm" strings are anchored to the log's UTC day so they're storable
 * as DateTime columns.
 */
export function flattenBiometric(
  input: BiometricInput,
): Record<string, unknown> {
  const date = input.date ? new Date(input.date) : new Date();
  const out: Record<string, unknown> = { date };

  if (input.body) Object.assign(out, input.body);
  if (input.circumferences) Object.assign(out, input.circumferences);
  if (input.cardiovascular) Object.assign(out, input.cardiovascular);
  if (input.metabolic) Object.assign(out, input.metabolic);
  if (input.activity) Object.assign(out, input.activity);

  if (input.sleep) {
    const {
      sleepBedtime,
      sleepWakeTime,
      sleepHours,
      sleepQuality,
      sleepAwakenings,
    } = input.sleep;
    out.sleepHours = sleepHours ?? null;
    out.sleepQuality = sleepQuality ?? null;
    out.sleepAwakenings = sleepAwakenings ?? null;

    const anchorDay = new Date(date);
    anchorDay.setUTCHours(0, 0, 0, 0);
    out.sleepBedtime = sleepBedtime
      ? hhmmOnDay(sleepBedtime, anchorDay)
      : null;
    out.sleepWakeTime = sleepWakeTime
      ? hhmmOnDay(sleepWakeTime, anchorDay)
      : null;
  }

  if (input.energyLevel !== undefined) out.energyLevel = input.energyLevel;
  if (input.notes !== undefined) out.notes = input.notes;

  return out;
}

function hhmmOnDay(hhmm: string, day: Date): Date {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const d = new Date(day);
  d.setUTCHours(h, m, 0, 0);
  return d;
}
