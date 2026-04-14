export type BiometricEntry = {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  bodyFatPercentage: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  restingHR: number | null;
  hrv: number | null;
  bloodGlucose: number | null;
  energyLevel: number | null; // 1-10
  sleepHours: number | null;
  sleepQuality: number | null; // 1-10
  steps: number | null;
  notes: string | null;
  // optional measurements
  waist: number | null;
  chest: number | null;
  armRight: number | null;
  thighRight: number | null;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
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
    // Some days omit metrics to simulate partial logging
    const isThorough = day % 3 !== 0;
    entries.push({
      date: toISODate(d),
      weightKg: Math.round(weight * 10) / 10,
      bodyFatPercentage: isThorough
        ? Math.round((18 - day * 0.015) * 10) / 10
        : null,
      systolicBP: isThorough ? 118 + Math.round(Math.sin(day / 5) * 4) : null,
      diastolicBP: isThorough ? 78 + Math.round(Math.cos(day / 5) * 3) : null,
      restingHR: isThorough ? 58 + Math.round(Math.sin(day / 6) * 3) : null,
      hrv: isThorough ? 55 + Math.round(Math.cos(day / 7) * 8) : null,
      bloodGlucose: null,
      energyLevel: 5 + Math.round(Math.sin(day / 3) * 2.5) + 2,
      sleepHours: 7 + Math.round(Math.cos(day / 4) * 8) / 10,
      sleepQuality: 6 + Math.round(Math.sin(day / 5) * 2),
      steps: 7000 + Math.round(Math.cos(day / 2) * 3000),
      notes: null,
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
  const blank: BiometricEntry = {
    date,
    weightKg: null,
    bodyFatPercentage: null,
    systolicBP: null,
    diastolicBP: null,
    restingHR: null,
    hrv: null,
    bloodGlucose: null,
    energyLevel: null,
    sleepHours: null,
    sleepQuality: null,
    steps: null,
    notes: null,
    waist: null,
    chest: null,
    armRight: null,
    thighRight: null,
  };
  const entry = { ...blank, ...patch, date };
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
