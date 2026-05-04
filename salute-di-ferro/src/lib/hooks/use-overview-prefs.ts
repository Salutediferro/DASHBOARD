"use client";

import * as React from "react";

/**
 * UI-only preference for which metrics the patient wants pinned at the
 * top of the dashboard home. Capped at 4 visible cards. Stored in
 * localStorage — purely presentational, no cross-device sync needed.
 *
 * Mirrors the convention in `useHealthCategoryPrefs`: hydrated flag so
 * the first paint matches the SSR fallback (default selection), then
 * swaps to the user's choice on the client.
 */

export const OVERVIEW_METRIC_KEYS = [
  // Core / cross-cutting
  "weight",
  "weightDelta",
  "bmi",
  "checkIns",
  "nextAppointment",
  // Body composition
  "bodyFat",
  "muscleMass",
  "bodyWater",
  // Circumferences
  "waist",
  "hips",
  "chest",
  "arms",
  "thigh",
  "calves",
  // Cardiovascular
  "bloodPressure",
  "restingHR",
  "spo2",
  "hrv",
  // Metabolic
  "glucoseFasting",
  "glucosePostMeal",
  "bodyTempC",
  "ketones",
  // Sleep
  "sleepHours",
  "sleepQuality",
  "sleepAwakenings",
  // Activity
  "steps",
  "caloriesBurned",
  "activeMinutes",
  "distanceKm",
  // Wellbeing
  "mood",
  "energy",
  "energyLevel",
] as const;

export type OverviewMetricKey = (typeof OVERVIEW_METRIC_KEYS)[number];

const STORAGE_KEY = "sdf.overview.selected.v1";
export const OVERVIEW_MAX = 4;
export const OVERVIEW_DEFAULT: OverviewMetricKey[] = [
  "weight",
  "bmi",
  "checkIns",
  "nextAppointment",
];

function readInitial(): OverviewMetricKey[] {
  if (typeof window === "undefined") return OVERVIEW_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return OVERVIEW_DEFAULT;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return OVERVIEW_DEFAULT;
    const valid = parsed.filter((k): k is OverviewMetricKey =>
      (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
    );
    return valid.length > 0 ? valid.slice(0, OVERVIEW_MAX) : OVERVIEW_DEFAULT;
  } catch {
    return OVERVIEW_DEFAULT;
  }
}

export function useOverviewPrefs() {
  const [selected, setSelected] = React.useState<OverviewMetricKey[]>(OVERVIEW_DEFAULT);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setSelected(readInitial());
    setHydrated(true);
  }, []);

  const persist = (next: OverviewMetricKey[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage disabled / quota — selection stays in-memory.
    }
  };

  const toggle = React.useCallback((key: OverviewMetricKey) => {
    setSelected((prev) => {
      let next: OverviewMetricKey[];
      if (prev.includes(key)) {
        // Refuse to drop below 1 — an empty overview row reads as broken.
        if (prev.length <= 1) return prev;
        next = prev.filter((k) => k !== key);
      } else {
        if (prev.length >= OVERVIEW_MAX) return prev;
        next = [...prev, key];
      }
      persist(next);
      return next;
    });
  }, []);

  const setOrder = React.useCallback((next: OverviewMetricKey[]) => {
    // Defensive: drop unknown keys, clamp at the cap. Keeps legacy
    // localStorage values from breaking the UI if the registry ever
    // shrinks.
    const filtered = next.filter((k): k is OverviewMetricKey =>
      (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
    );
    const clamped = filtered.slice(0, OVERVIEW_MAX);
    setSelected(clamped);
    persist(clamped);
  }, []);

  return { selected, hydrated, toggle, setOrder, max: OVERVIEW_MAX };
}
