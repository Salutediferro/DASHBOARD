"use client";

import * as React from "react";
import type { CookieCategoryId } from "./constants";

/**
 * Consenso cookie — persistito in localStorage sotto `sdf-consent`.
 *
 * Schema:
 *   {
 *     version: 1,
 *     decidedAt: ISO timestamp,
 *     necessary: true,       // sempre true
 *     analytics: boolean,
 *   }
 *
 * Versione: bumpa la costante se cambi le categorie o la policy,
 * così i banner ricompaiono e il consenso viene ririchiesto.
 */

const STORAGE_KEY = "sdf-consent";
const CURRENT_VERSION = 1;

export type ConsentState = {
  version: number;
  decidedAt: string;
  necessary: true;
  analytics: boolean;
};

export type ConsentChoice = {
  necessary: true;
  analytics: boolean;
};

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): ConsentState {
  const state: ConsentState = {
    version: CURRENT_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    analytics: choice.analytics,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("sdf-consent-change", { detail: state }));
  }
  return state;
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("sdf-consent-change", { detail: null }));
}

/**
 * React hook that reads current consent and re-renders when it changes.
 * `undefined` while hydrating; `null` if the user has never decided;
 * `ConsentState` otherwise.
 */
export function useConsent(): ConsentState | null | undefined {
  const [state, setState] = React.useState<ConsentState | null | undefined>(
    undefined,
  );
  React.useEffect(() => {
    setState(readConsent());
    const onChange = (e: Event) =>
      setState((e as CustomEvent<ConsentState | null>).detail);
    window.addEventListener("sdf-consent-change", onChange);
    return () => window.removeEventListener("sdf-consent-change", onChange);
  }, []);
  return state;
}

export function isCategoryEnabled(
  state: ConsentState | null | undefined,
  category: CookieCategoryId,
): boolean {
  if (category === "necessary") return true;
  if (!state) return false;
  if (category === "analytics") return state.analytics;
  return false;
}
