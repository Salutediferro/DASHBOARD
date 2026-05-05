"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Shown on the dashboard overview and the "Dati salute" page when the
 * patient's `selectedMetrics` is empty — either because they cleared
 * the list themselves or because legacy data didn't survive a vocab
 * change. Both surfaces would otherwise render an empty grid that
 * reads as broken; this state explains the situation and links to the
 * profile editor where the user can pick metrics again.
 */
export function NoTrackedMetricsState({ className }: Props) {
  return (
    <section
      role="status"
      className={cn(
        "border-border/60 bg-muted/20 flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="bg-card text-muted-foreground inline-flex h-10 w-10 items-center justify-center rounded-full">
        <SlidersHorizontal className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-display text-base">Nessuna metrica tracciata</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Scegli quali parametri vuoi monitorare per popolare la dashboard, la
          pagina Dati salute e il modulo di rilevazione.
        </p>
      </div>
      <Link
        href="/dashboard/patient/profile#metriche"
        className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Scegli le metriche
      </Link>
    </section>
  );
}
