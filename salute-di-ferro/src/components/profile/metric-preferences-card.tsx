"use client";

import * as React from "react";
import { CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUser } from "@/lib/hooks/use-user";
import {
  OVERVIEW_DEFAULT,
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { MetricSelector } from "./metric-selector";

/**
 * Long-form editor for the patient's tracked-metrics list. Mounted
 * inside the profile page (anchor `#metriche`) — the canonical place
 * to change selection. The dashboard, health page, and rilevazione
 * dialog all link here.
 *
 * Saves to /api/me PATCH and invalidates the profile query so other
 * components (sidebar, useUser consumers) see the new list.
 */
export function MetricPreferencesCard() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  const initial = React.useMemo<OverviewMetricKey[]>(() => {
    const valid = OVERVIEW_METRIC_KEYS as readonly string[];
    const fromServer = (profile?.selectedMetrics ?? []).filter(
      (k): k is OverviewMetricKey => valid.includes(k),
    );
    return fromServer.length > 0 ? fromServer : [...OVERVIEW_DEFAULT];
  }, [profile?.selectedMetrics]);

  const [selected, setSelected] = React.useState<OverviewMetricKey[]>(initial);
  const lastSeen = React.useRef<string>(JSON.stringify(initial));

  // Pull in fresher server data on mount/refetch without clobbering
  // a half-edited list (only sync if the user hasn't touched it yet
  // since last server snapshot).
  React.useEffect(() => {
    const k = JSON.stringify(initial);
    if (lastSeen.current === k) return;
    lastSeen.current = k;
    setSelected(initial);
  }, [initial]);

  const persist = React.useCallback(
    async (next: OverviewMetricKey[]) => {
      setPending(true);
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedMetrics: next }),
        });
        if (!res.ok) throw new Error();
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setSavedAt(Date.now());
      } catch {
        toast.error("Errore nel salvataggio");
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );

  const onToggle = React.useCallback(
    (key: OverviewMetricKey) => {
      setSelected((prev) => {
        let next: OverviewMetricKey[];
        if (prev.includes(key)) {
          if (prev.length <= 1) return prev;
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

  // Anchor-scroll fix: the profile page is client-rendered and shows a
  // skeleton before this card mounts, so the browser's built-in
  // anchor-jump fires too early and gets discarded. After the section
  // is in the DOM, re-trigger the scroll if the URL still points here.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#metriche") return;
    const el = document.getElementById("metriche");
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <section
      id="metriche"
      aria-labelledby="metric-prefs-title"
      className="surface-1 flex flex-col gap-4 scroll-mt-20 rounded-xl p-5"
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="metric-prefs-title"
            className="text-display flex items-center gap-2 text-lg"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Metriche da monitorare
          </h2>
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            {pending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Salvataggio…
              </>
            ) : savedAt != null ? (
              <>
                <CheckCircle2 className="text-emerald-500 h-3 w-3" aria-hidden />
                Salvato
              </>
            ) : null}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Selezionate {selected.length} metriche. Filtreranno la dashboard, la
          pagina Dati salute e il modulo di rilevazione.
        </p>
      </header>
      <MetricSelector selected={selected} onToggle={onToggle} />
    </section>
  );
}
