"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  Loader2,
  MessageSquareQuote,
  Plus,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Patient-side check-in index. Lists every check-in the user has
 * submitted (newest first) with photo thumbnails, week-over-week
 * weight delta, status, and a quick "feedback received" hint when the
 * professional has reviewed an entry. The page intentionally avoids
 * charts / aggregates — the goal is a clean, scannable history that
 * the patient can drill into for the rich detail view.
 */

type CheckInListItem = {
  id: string;
  date: string;
  weight: number | null;
  frontPhotoUrl: string | null;
  notes: string | null;
  rating: number | null;
  professionalFeedback: string | null;
  status: "PENDING" | "REVIEWED";
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "oggi";
  if (d === 1) return "ieri";
  if (d < 7) return `${d}g fa`;
  if (d < 30) return `${Math.floor(d / 7)} sett. fa`;
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

export default function PatientCheckInIndexPage() {
  const { data, isLoading } = useQuery<{ items: CheckInListItem[] }>({
    queryKey: ["check-ins-list"],
    queryFn: async () => {
      const res = await fetch("/api/check-ins?status=ALL");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <ClipboardCheck className="text-primary-500 h-7 w-7" />
            Check-in
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Condividi peso, misure, foto e note con il tuo coach o
            professionista — tutto in un unico posto.
          </p>
        </div>
        <Link
          href="/dashboard/patient/check-in/new"
          className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nuovo check-in
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Cronologia</h2>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((c, i) => (
              <CheckInRow
                key={c.id}
                item={c}
                /* `items` is desc; the next index is the previous entry. */
                previous={items[i + 1] ?? null}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Camera className="text-muted-foreground/40 h-10 w-10" />
        <div>
          <p className="text-sm font-medium">Nessun check-in</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs">
            Carica peso, misure, foto e note: dai al tuo coach un quadro chiaro
            della tua settimana.
          </p>
        </div>
        <Link
          href="/dashboard/patient/check-in/new"
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Crea il primo
        </Link>
      </CardContent>
    </Card>
  );
}

function CheckInRow({
  item,
  previous,
}: {
  item: CheckInListItem;
  previous: CheckInListItem | null;
}) {
  // Week-over-week weight callout. Negative = loss (green), positive =
  // gain (amber). We don't editorialize either direction — just show
  // the trend and let the patient interpret it.
  const weightDelta =
    item.weight != null && previous?.weight != null
      ? Math.round((item.weight - previous.weight) * 10) / 10
      : null;

  return (
    <li>
      <Link
        href={`/dashboard/patient/check-in/${item.id}`}
        className="focus-ring border-border/60 hover:bg-muted/30 flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors"
      >
        <div className="bg-muted relative h-14 w-12 shrink-0 overflow-hidden rounded-md">
          {item.frontPhotoUrl ? (
            // Stored as a base64 data URL or storage URL — both render.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.frontPhotoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground/40 flex h-full items-center justify-center">
              <Camera className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium capitalize">{fmtDate(item.date)}</p>
            <span className="text-muted-foreground text-[11px]">
              · {relTime(item.date)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge
              variant={item.status === "REVIEWED" ? "secondary" : "outline"}
              className={cn(
                "text-[10px]",
                item.status === "REVIEWED" && "text-success",
              )}
            >
              {item.status === "REVIEWED" ? "Revisionato" : "In attesa"}
            </Badge>
            {item.professionalFeedback && (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 text-[10px]"
              >
                <MessageSquareQuote className="h-3 w-3" />
                Feedback
              </Badge>
            )}
            {item.weight != null && (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <strong className="text-foreground tabular-nums">
                  {item.weight.toFixed(1)} kg
                </strong>
                {weightDelta != null && weightDelta !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[11px] font-medium",
                      weightDelta < 0 ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {weightDelta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {weightDelta > 0 ? "+" : ""}
                    {weightDelta.toFixed(1)}
                  </span>
                )}
              </span>
            )}
            {item.rating != null && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3 w-3",
                      n < item.rating!
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </span>
            )}
          </div>

          {item.notes && (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
              “{item.notes}”
            </p>
          )}
        </div>

        <ArrowRight className="text-muted-foreground/60 h-4 w-4 shrink-0" />
      </Link>
    </li>
  );
}
