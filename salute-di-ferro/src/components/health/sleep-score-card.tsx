"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Moon } from "lucide-react";

import MetricRing from "@/components/brand/metric-ring";
import { cn } from "@/lib/utils";
import type { SleepScoreSummary } from "@/lib/health/sleep-score";

/**
 * Renders the rolling sleep wellness score plus, when the score is in
 * the "low" band, a non-intrusive CTA to book a session with the
 * user's coach. Deliberately no push notifications in this first cut —
 * the user asked to "start from sleep to the coach", and we prefer a
 * visible nudge they can ignore over a notification that might misfire
 * on a small sample.
 */
export function SleepScoreCard({ summary }: { summary: SleepScoreSummary }) {
  const { avg, count, windowDays, latest, band } = summary;

  if (avg == null) {
    return (
      <div className="surface-1 flex items-start gap-3 rounded-xl p-4">
        <Moon className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">Score sonno</p>
          <p className="text-muted-foreground text-xs">
            Registra ore dormite, qualità e risvegli per vedere un punteggio
            medio sul tuo sonno.
          </p>
        </div>
      </div>
    );
  }

  // Progress for the ring is 0..1 of the 0..10 score.
  const progress = Math.max(0, Math.min(1, avg / 10));
  const ringAriaLabel = `Score medio sonno: ${avg} su 10, basato su ${count} registrazioni negli ultimi ${windowDays} giorni`;

  return (
    <div className="surface-1 flex flex-col gap-4 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <MetricRing
          value={progress}
          size={96}
          strokeWidth={9}
          label={avg.toFixed(1)}
          sublabel="/ 10"
          ariaLabel={ringAriaLabel}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Score sonno medio</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                band === "good" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                band === "ok" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                band === "low" && "bg-destructive/15 text-destructive",
              )}
            >
              {band === "good" ? "buono" : band === "ok" ? "nella media" : "basso"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Media ultimi {windowDays} giorni · {count} registrazion
            {count === 1 ? "e" : "i"}
            {latest != null && ` · ultima ${latest.toFixed(1)}`}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px]">
            Calcolato da ore dormite, qualità autoriportata e numero di
            risvegli.
          </p>
        </div>
      </div>

      {band === "low" && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 h-4 w-4 text-destructive"
              aria-hidden
            />
            <div className="text-xs">
              <p className="font-medium text-destructive">
                Il tuo sonno è sotto media.
              </p>
              <p className="text-muted-foreground">
                Prenota una consulenza col tuo coach per capire cosa migliorare.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/patient/appointments"
            className="focus-ring inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Prenota col coach
          </Link>
        </div>
      )}
    </div>
  );
}
