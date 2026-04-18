"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Completeness } from "@/lib/profile-completeness";

type Props = {
  completeness: Completeness;
  /** When true (dashboard context), only render if there are critical gaps. */
  criticalOnly?: boolean;
  /** Label tells the user where clicking takes them. */
  ctaHref?: string;
  ctaLabel?: string;
};

export function CompletenessCard({
  completeness,
  criticalOnly,
  ctaHref = "/dashboard/patient/profile",
  ctaLabel = "Completa profilo",
}: Props) {
  const { percent, missing, missingCritical } = completeness;
  if (criticalOnly && missingCritical.length === 0) return null;
  if (percent === 100) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-muted-foreground">
            Profilo completo. I tuoi professionisti hanno tutto ciò che serve.
          </span>
        </CardContent>
      </Card>
    );
  }

  const tone =
    missingCritical.length > 0
      ? "border-amber-500/50 bg-amber-500/5"
      : "border-border";

  return (
    <Card className={cn(tone)}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {missingCritical.length > 0 ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          ) : (
            <div className="bg-primary/15 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {percent}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {missingCritical.length > 0
                ? "Completa i dati clinici critici"
                : `Profilo al ${percent}%`}
            </p>
            <p className="text-muted-foreground text-xs">
              {missingCritical.length > 0
                ? "Allergie, contatti emergenza e telefono aiutano il tuo team in caso di necessità."
                : `${completeness.filled}/${completeness.total} campi compilati.`}
            </p>
          </div>
          <Link
            href={ctaHref}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium"
          >
            {ctaLabel}
          </Link>
        </div>

        {/* Progress bar */}
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full transition-all",
              missingCritical.length > 0 ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Missing fields tags (only when there's something to fill) */}
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 8).map((f) => (
              <Badge
                key={f.key as string}
                variant={f.critical ? "secondary" : "outline"}
                className={cn(
                  "text-[10px]",
                  f.critical &&
                    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                {f.label}
              </Badge>
            ))}
            {missing.length > 8 && (
              <Badge variant="outline" className="text-[10px]">
                +{missing.length - 8}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
