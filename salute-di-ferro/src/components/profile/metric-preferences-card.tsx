"use client";

import * as React from "react";
import { CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";

import { useOverviewPrefs } from "@/lib/hooks/use-overview-prefs";
import { MetricSelector } from "./metric-selector";

/**
 * Long-form editor for the patient's tracked-metrics list. Mounted
 * inside the profile page (anchor `#metriche`) — the canonical place
 * to change selection. The dashboard, health page, and rilevazione
 * dialog all link here.
 *
 * State + persistence go through `useOverviewPrefs` so this card stays
 * consistent with `MetricPreferencesDialog`, the dashboard cards, and
 * the health-page rings.
 */
export function MetricPreferencesCard() {
  const { selected, toggle, pending, savedAt } = useOverviewPrefs();

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
      <MetricSelector selected={selected} onToggle={toggle} />
    </section>
  );
}
