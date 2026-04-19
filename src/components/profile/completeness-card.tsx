"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Completeness } from "@/lib/profile-completeness";

type Props = {
  completeness: Completeness;
  /** When true (dashboard context), only render if there are critical gaps. */
  criticalOnly?: boolean;
  /** Label tells the user where clicking takes them. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Base href for missing-field deep links (appends #field-<key>). */
  fieldBaseHref?: string;
};

export function CompletenessCard({
  completeness,
  criticalOnly,
  ctaHref = "/dashboard/patient/profile",
  ctaLabel = "Completa profilo",
  fieldBaseHref = "/dashboard/patient/profile",
}: Props) {
  const { percent, missing, missingCritical } = completeness;
  if (criticalOnly && missingCritical.length === 0) return null;

  if (percent === 100) {
    return (
      <div className="surface-1 flex items-center gap-3 rounded-xl p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
        <span className="text-muted-foreground">
          Profilo completo. I tuoi professionisti hanno tutto ciò che serve.
        </span>
      </div>
    );
  }

  const urgent = missingCritical.length > 0;

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl p-4",
        urgent
          ? "border border-warning/40 bg-warning/5"
          : "surface-1",
      )}
      aria-labelledby="completeness-heading"
    >
      <div className="flex items-start gap-3">
        {urgent ? (
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-warning"
            aria-hidden
          />
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-[11px] font-bold text-primary-500">
            {percent}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 id="completeness-heading" className="text-sm font-semibold">
            {urgent ? "Completa i dati clinici critici" : `Profilo al ${percent}%`}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {urgent
              ? "Allergie, contatti di emergenza e recapiti aiutano il tuo team in caso di necessità."
              : `${completeness.filled}/${completeness.total} campi compilati.`}
          </p>
        </div>
      </div>

      {/* Gold progress bar */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Completezza profilo"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            urgent ? "bg-warning" : "bg-primary-500",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Missing fields — deep-linkable chips */}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missing.slice(0, 10).map((f) => (
            <Link
              key={String(f.key)}
              href={`${fieldBaseHref}#field-${String(f.key)}`}
              className={cn(
                "focus-ring inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                f.critical
                  ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
          {missing.length > 10 && (
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              +{missing.length - 10}
            </span>
          )}
        </div>
      )}

      <Link
        href={ctaHref}
        className="focus-ring mt-1 inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
