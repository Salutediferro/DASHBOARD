// NOTE: mock in-memory — resets on each server restart/redeploy.
// Field names mirror Prisma `BiometricLog` / `User.heightCm` so the future
// swap to the real DB is a straight rename of the storage layer.

export type BiometricEntry = {
  date: string; // YYYY-MM-DD

  // Body composition
  heightCm: number | null; // denormalized from User for standalone mock
  weightKg: number | null;
  bodyFatPercentage: number | null;
  muscleMassKg: number | null;
  bodyWaterPct: number | null;

  // Circumferences (cm)
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  armsCm: number | null;
  thighCm: number | null;
  calvesCm: number | null;

  // Cardiovascular
  systolicBP: number | null;
  diastolicBP: number | null;
  restingHR: number | null;
  spo2: number | null; // %
  hrv: number | null; // ms

  // Metabolic
  glucoseFasting: number | null; // mg/dL
  glucosePostMeal: number | null; // mg/dL
  ketones: number | null; // mmol/L
  bodyTempC: number | null;

  // Sleep
  sleepHours: number | null;
  sleepQuality: number | null; // 1-10
  sleepBedtime: string | null; // "HH:mm"
  sleepWakeTime: string | null; // "HH:mm"
  sleepAwakenings: number | null;

  // Activity
  steps: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  distanceKm: number | null;

  // Subjective
  energyLevel: number | null; // 1-10
  notes: string | null;

  // --- Legacy aliases (kept for backward-compat with older chart code) ---
  /** @deprecated use glucoseFasting / glucosePostMeal */
  bloodGlucose: number | null;
  /** @deprecated use waistCm */
  waist: number | null;
  /** @deprecated use chestCm */
  chest: number | null;
  /** @deprecated use armsCm */
  armRight: number | null;
  /** @deprecated use thighCm */
  thighRight: number | null;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function blankEntry(date: string): BiometricEntry {
  return {
    date,
    heightCm: null,
    weightKg: null,
    bodyFatPercentage: null,
    muscleMassKg: null,
    bodyWaterPct: null,
    waistCm: null,
    hipsCm: null,
    chestCm: null,
    armsCm: null,
    thighCm: null,
    calvesCm: null,
    systolicBP: null,
    diastolicBP: null,
    restingHR: null,
    spo2: null,
    hrv: null,
    glucoseFasting: null,
    glucosePostMeal: null,
    ketones: null,
    bodyTempC: null,
    sleepHours: null,
    sleepQuality: null,
    sleepBedtime: null,
    sleepWakeTime: null,
    sleepAwakenings: null,
    steps: null,
    caloriesBurned: null,
    activeMinutes: null,
    distanceKm: null,
    energyLevel: null,
    notes: null,
    bloodGlucose: null,
    waist: null,
    chest: null,
    armRight: null,
    thighRight: null,
  };
}

function seed(): BiometricEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entries: BiometricEntry[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = 89 - i;
    const weight = 80 - day * 0.04 + Math.sin(day / 4) * 0.6;
    const isThorough = day % 3 !== 0;

    const base = blankEntry(toISODate(d));
    entries.push({
      ...base,
      heightCm: 178,
      weightKg: Math.round(weight * 10) / 10,
      bodyFatPercentage: isThorough
        ? Math.round((18 - day * 0.015) * 10) / 10
        : null,
      muscleMassKg: isThorough ? Math.round((38 + day * 0.01) * 10) / 10 : null,
      bodyWaterPct: isThorough ? 58 + Math.round(Math.sin(day / 6) * 2) : null,
      waistCm: isThorough ? 85 - day * 0.02 : null,
      chestCm: isThorough ? 102 + day * 0.01 : null,
      armsCm: isThorough ? 36 + day * 0.008 : null,
      thighCm: isThorough ? 58 + day * 0.005 : null,
      systolicBP: isThorough ? 118 + Math.round(Math.sin(day / 5) * 4) : null,
      diastolicBP: isThorough ? 78 + Math.round(Math.cos(day / 5) * 3) : null,
      restingHR: isThorough ? 58 + Math.round(Math.sin(day / 6) * 3) : null,
      hrv: isThorough ? 55 + Math.round(Math.cos(day / 7) * 8) : null,
      energyLevel: 5 + Math.round(Math.sin(day / 3) * 2.5) + 2,
      sleepHours: 7 + Math.round(Math.cos(day / 4) * 8) / 10,
      sleepQuality: 6 + Math.round(Math.sin(day / 5) * 2),
      steps: 7000 + Math.round(Math.cos(day / 2) * 3000),
      // legacy mirrors
      waist: isThorough ? 85 - day * 0.02 : null,
      chest: isThorough ? 102 + day * 0.01 : null,
      armRight: isThorough ? 36 + day * 0.008 : null,
      thighRight: isThorough ? 58 + day * 0.005 : null,
    });
  }

  return entries;
}

let ENTRIES: BiometricEntry[] = seed();

export function listBiometrics(filters?: {
  from?: string;
  to?: string;
}): BiometricEntry[] {
  const { from, to } = filters ?? {};
  return ENTRIES.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  }).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function getToday(): BiometricEntry | null {
  const today = toISODate(new Date());
  return ENTRIES.find((e) => e.date === today) ?? null;
}

export function upsertEntry(
  patch: Partial<BiometricEntry> & { date?: string },
): BiometricEntry {
  const date = patch.date ?? toISODate(new Date());
  const idx = ENTRIES.findIndex((e) => e.date === date);
  if (idx >= 0) {
    ENTRIES[idx] = { ...ENTRIES[idx]!, ...patch, date };
    return ENTRIES[idx]!;
  }
  const entry = { ...blankEntry(date), ...patch, date };
  ENTRIES = [...ENTRIES, entry];
  return entry;
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function getSummary() {
  const last30 = ENTRIES.slice(-30);
  const last7 = ENTRIES.slice(-7);
  const prev7 = ENTRIES.slice(-14, -7);

  function trend(cur: number | null, prev: number | null) {
    if (cur == null || prev == null) return 0;
    return cur - prev;
  }

  return {
    weightKg: {
      current: avg(last7.map((e) => e.weightKg)),
      previous: avg(prev7.map((e) => e.weightKg)),
      sparkline: last30.map((e) => e.weightKg ?? 0),
    },
    energyLevel: {
      current: avg(last7.map((e) => e.energyLevel)),
      previous: avg(prev7.map((e) => e.energyLevel)),
      sparkline: last30.map((e) => e.energyLevel ?? 0),
    },
    sleepHours: {
      current: avg(last7.map((e) => e.sleepHours)),
      previous: avg(prev7.map((e) => e.sleepHours)),
      sparkline: last30.map((e) => e.sleepHours ?? 0),
    },
    steps: {
      current: avg(last7.map((e) => e.steps)),
      previous: avg(prev7.map((e) => e.steps)),
      sparkline: last30.map((e) => e.steps ?? 0),
    },
    trends: {
      weightKg: trend(
        avg(last7.map((e) => e.weightKg)),
        avg(prev7.map((e) => e.weightKg)),
      ),
    },
  };
}
