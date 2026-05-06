"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  OVERVIEW_DEFAULT,
  OVERVIEW_MAX,
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { useUser } from "@/lib/hooks/use-user";

/**
 * The patient's tracked-metrics list — what the dashboard, the health
 * page rings/tabs, and the rilevazione form filter against. Initial
 * value comes from the server (User.selectedMetrics, set during
 * onboarding); user mutations PATCH /api/me so the same selection
 * follows them across devices.
 *
 * Empty initial array = legacy account (onboarded before this feature
 * shipped) — fall back to OVERVIEW_DEFAULT so the dashboard has
 * something to render until the user edits from the profile.
 */
export {
  OVERVIEW_DEFAULT,
  OVERVIEW_MAX,
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
};

function sanitize(input: readonly string[] | undefined): OverviewMetricKey[] {
  if (!input || input.length === 0) return [...OVERVIEW_DEFAULT];
  const valid = input.filter((k): k is OverviewMetricKey =>
    (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
  );
  return valid.length > 0 ? valid : [...OVERVIEW_DEFAULT];
}

export function useOverviewPrefs(initialSelected?: readonly string[]) {
  const queryClient = useQueryClient();
  // Subscribe to the live profile so any consumer of this hook syncs
  // when another tab/component PATCHes /api/me. The server-rendered
  // `initialSelected` prop still seeds the first paint to keep SSR
  // consistent.
  const { profile } = useUser();
  const [selected, setSelected] = React.useState<OverviewMetricKey[]>(() =>
    sanitize(initialSelected),
  );
  const [pending, setPending] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  // Counter of in-flight PATCH /api/me requests. While > 0, the
  // local optimistic state is the source of truth — any incoming
  // server snapshot reflects an EARLIER toggle and would clobber the
  // user's most recent click. We resume syncing once writes settle.
  const inflight = React.useRef(0);

  // Re-sync when either the SSR-prop OR the live profile data carries
  // a fresher list. Compared by JSON to avoid loops on identical
  // arrays. Skipped while a write is pending (see comment above).
  const lastSeen = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (inflight.current > 0) return;
    const live = profile?.selectedMetrics;
    const next = live ?? initialSelected;
    if (!next) return;
    const k = JSON.stringify(next);
    if (lastSeen.current === k) return;
    lastSeen.current = k;
    setSelected(sanitize(next));
  }, [initialSelected, profile?.selectedMetrics]);

  const persist = React.useCallback(
    async (next: OverviewMetricKey[]) => {
      inflight.current += 1;
      setPending(true);
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedMetrics: next }),
        });
        if (!res.ok) throw new Error();
        // Mark this snapshot as already-applied so the resulting
        // ["profile"] refetch doesn't re-run sanitize() and visibly
        // re-render the same list.
        lastSeen.current = JSON.stringify(next);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setSavedAt(Date.now());
      } catch {
        toast.error("Errore nel salvataggio delle metriche");
      } finally {
        inflight.current -= 1;
        if (inflight.current === 0) setPending(false);
      }
    },
    [queryClient],
  );

  const toggle = React.useCallback(
    (key: OverviewMetricKey) => {
      setSelected((prev) => {
        let next: OverviewMetricKey[];
        if (prev.includes(key)) {
          if (prev.length <= 1) return prev; // never empty — broken UX
          next = prev.filter((k) => k !== key);
        } else {
          next = [...prev, key];
        }
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const setOrder = React.useCallback(
    (next: OverviewMetricKey[]) => {
      const filtered = next.filter((k): k is OverviewMetricKey =>
        (OVERVIEW_METRIC_KEYS as readonly string[]).includes(k),
      );
      setSelected(filtered);
      void persist(filtered);
    },
    [persist],
  );

  const clearSavedAt = React.useCallback(() => setSavedAt(null), []);

  return {
    selected,
    hydrated: true,
    toggle,
    setOrder,
    pending,
    savedAt,
    clearSavedAt,
    max: OVERVIEW_MAX,
  };
}
