"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  OVERVIEW_DEFAULT,
  OVERVIEW_MAX,
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";

/**
 * The patient's tracked-metrics list — what the dashboard, the health
 * page, and the rilevazione form filter against. Initial value comes
 * from the server (User.selectedMetrics, set during onboarding); user
 * mutations PATCH /api/me so the same selection follows them across
 * devices.
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
  const [selected, setSelected] = React.useState<OverviewMetricKey[]>(() =>
    sanitize(initialSelected),
  );

  // If a fresher server value lands later (e.g. profile cache refetch),
  // sync it in. Compared by JSON to avoid loops on identical arrays.
  const lastSeen = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!initialSelected) return;
    const k = JSON.stringify(initialSelected);
    if (lastSeen.current === k) return;
    lastSeen.current = k;
    setSelected(sanitize(initialSelected));
  }, [initialSelected]);

  const persist = React.useCallback(
    async (next: OverviewMetricKey[]) => {
      try {
        await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedMetrics: next }),
        });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      } catch {
        // Network blip — local state stays optimistic; next mutation
        // re-tries with the latest array.
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

  return { selected, hydrated: true, toggle, setOrder, max: OVERVIEW_MAX };
}
