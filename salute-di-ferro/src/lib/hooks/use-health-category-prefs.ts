"use client";

import * as React from "react";

/**
 * UI-only preference for which Dati Salute categories the user wants to
 * see. Stored in localStorage — a hidden category keeps ingesting data
 * via the API (historical rows aren't lost), it's just hidden from the
 * tabs and the "Aggiungi rilevazione" pill selector.
 *
 * localStorage instead of a DB column because:
 *   - purely presentational, no cross-device coordination needed;
 *   - no migration risk on a live GDPR Art. 9 product;
 *   - switching to server-backed prefs later is a single query swap.
 */
const STORAGE_KEY = "sdf.health.hiddenCategories.v1";

export type HealthCategoryKey =
  | "body"
  | "circumferences"
  | "cardiovascular"
  | "metabolic"
  | "sleep"
  | "activity";

function readInitial(): Set<HealthCategoryKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed as HealthCategoryKey[]);
  } catch {
    return new Set();
  }
}

export function useHealthCategoryPrefs() {
  const [hidden, setHidden] = React.useState<Set<HealthCategoryKey>>(
    () => new Set(),
  );
  // Hydrate from localStorage after mount to avoid SSR/CSR mismatch.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHidden(readInitial());
    setHydrated(true);
  }, []);

  const persist = (next: Set<HealthCategoryKey>) => {
    setHidden(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(next)),
      );
    } catch {
      // localStorage disabled / quota — ignore, prefs stay in-memory
    }
  };

  const toggle = React.useCallback((key: HealthCategoryKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Array.from(next)),
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const reset = React.useCallback(() => persist(new Set()), []);

  return { hidden, hydrated, toggle, reset };
}
