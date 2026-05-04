"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { readApiError } from "@/lib/api-error";

/**
 * Per-metric personal targets. Single number for most cards, composite
 * `{systolic, diastolic}` for blood pressure. Persisted server-side via
 * `/api/metric-targets` so the upcoming native app reads the same data
 * the web dashboard writes.
 */
export type MetricTargetValue = number | { systolic: number; diastolic: number };

export type MetricTargetsMap = Partial<Record<OverviewMetricKey, MetricTargetValue>>;

type ServerRow = {
  metricKey: string;
  value: number;
  secondary: number | null;
};

const QUERY_KEY = ["metric-targets"] as const;

function rowsToMap(rows: ServerRow[]): MetricTargetsMap {
  const out: MetricTargetsMap = {};
  for (const r of rows) {
    const key = r.metricKey as OverviewMetricKey;
    if (r.secondary != null) {
      out[key] = { systolic: r.value, diastolic: r.secondary };
    } else {
      out[key] = r.value;
    }
  }
  return out;
}

function valueToBody(
  metricKey: OverviewMetricKey,
  value: MetricTargetValue,
): { metricKey: string; value: number; secondary: number | null } {
  if (typeof value === "number") {
    return { metricKey, value, secondary: null };
  }
  return { metricKey, value: value.systolic, secondary: value.diastolic };
}

export function useMetricTargets(opts?: { initialData?: MetricTargetsMap }) {
  const qc = useQueryClient();

  const query = useQuery<MetricTargetsMap>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/metric-targets", { cache: "no-store" });
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento obiettivi"));
      const json = (await res.json()) as { items: ServerRow[] };
      return rowsToMap(json.items);
    },
    // Seed from server-fetched data so the dashboard paints colours on
    // first render — no localStorage flash, no SSR hydration mismatch.
    initialData: opts?.initialData,
    staleTime: 30_000,
  });

  const setMutation = useMutation({
    mutationFn: async (args: { key: OverviewMetricKey; value: MetricTargetValue }) => {
      // Defensive: a stray empty string here would make the server's
      // Zod validator reject the request with the unhelpful
      // "metricKey: Invalid option" enum error. Catch it before fetch.
      if (!(OVERVIEW_METRIC_KEYS as readonly string[]).includes(args.key)) {
        throw new Error(`Metric "${args.key}" non riconosciuta`);
      }
      const res = await fetch("/api/metric-targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valueToBody(args.key, args.value)),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore salvataggio obiettivo"));
      return res.json();
    },
    // Optimistic: apply immediately so the card re-grades while the
    // request is in flight; roll back on error.
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<MetricTargetsMap>(QUERY_KEY);
      qc.setQueryData<MetricTargetsMap>(QUERY_KEY, (cur) => ({
        ...(cur ?? {}),
        [args.key]: args.value,
      }));
      return { prev };
    },
    onError: (err, _args, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Errore");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (key: OverviewMetricKey) => {
      if (!(OVERVIEW_METRIC_KEYS as readonly string[]).includes(key)) {
        throw new Error(`Metric "${key}" non riconosciuta`);
      }
      const res = await fetch(
        `/api/metric-targets?metricKey=${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await readApiError(res, "Errore rimozione obiettivo"));
      return res.json();
    },
    onMutate: async (key) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<MetricTargetsMap>(QUERY_KEY);
      qc.setQueryData<MetricTargetsMap>(QUERY_KEY, (cur) => {
        if (!cur || !(key in cur)) return cur ?? {};
        const next = { ...cur };
        delete next[key];
        return next;
      });
      return { prev };
    },
    onError: (err, _key, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Errore");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const setTarget = React.useCallback(
    (key: OverviewMetricKey, value: MetricTargetValue) => setMutation.mutateAsync({ key, value }),
    [setMutation],
  );
  const clearTarget = React.useCallback(
    (key: OverviewMetricKey) => clearMutation.mutateAsync(key),
    [clearMutation],
  );

  return {
    targets: query.data ?? {},
    // `hydrated` semantics for the rest of the app: true once we have
    // server data (initial OR fetched). Lets the grading layer treat
    // "no targets fetched yet" as neutral instead of flashing colours.
    hydrated: query.data != null,
    isLoading: query.isLoading,
    setTarget,
    clearTarget,
  };
}
