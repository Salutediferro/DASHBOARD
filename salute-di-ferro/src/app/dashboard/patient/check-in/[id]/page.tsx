"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  MessageSquareQuote,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Patient-side detail view for a single check-in.
 *
 * The same `/api/check-ins/[id]` endpoint that powers the professional's
 * review UI returns `current`, `previous` (immediately preceding entry
 * by this patient) and `history` (all entries asc). On the patient side
 * we use `previous` for a quick weight-delta callout — "+0.4 kg vs last
 * week" — and otherwise show photos, measurements, self-notes, plus the
 * professional's feedback once they've reviewed it.
 */

const ANGLE_LABELS = {
  front: "Fronte",
  side: "Fianco",
  back: "Schiena",
} as const;

const MEASUREMENT_LABELS: Record<string, string> = {
  waist: "Vita",
  chest: "Petto",
  armRight: "Braccio DX",
  armLeft: "Braccio SX",
  thighRight: "Coscia DX",
  thighLeft: "Coscia SX",
  calf: "Polpaccio",
};

type Measurements = Partial<Record<keyof typeof MEASUREMENT_LABELS, number | null>>;

type CheckInRow = {
  id: string;
  date: string;
  weight: number | null;
  measurements: Measurements | null;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
  notes: string | null;
  rating: number | null;
  professionalFeedback: string | null;
  status: "PENDING" | "REVIEWED";
  professionalRole: "DOCTOR" | "COACH";
  professional: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
};

type CheckInResponse = {
  current: CheckInRow;
  previous: CheckInRow | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role: "DOCTOR" | "COACH") {
  return role === "COACH" ? "Coach" : "Professionista";
}

export default function PatientCheckInDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const { data, isLoading, error } = useQuery<CheckInResponse>({
    queryKey: ["check-in", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/check-ins/${id}`);
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data?.current) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium">Check-in non trovato</p>
        <Link
          href="/dashboard/patient/check-in"
          className="text-primary text-xs underline"
        >
          Tutti i check-in
        </Link>
      </div>
    );
  }

  const c = data.current;
  const prev = data.previous;
  const photos: Array<[keyof typeof ANGLE_LABELS, string | null]> = [
    ["front", c.frontPhotoUrl],
    ["side", c.sidePhotoUrl],
    ["back", c.backPhotoUrl],
  ];
  const visiblePhotos = photos.filter(([, url]) => !!url);

  const measurementEntries = c.measurements
    ? (Object.entries(c.measurements).filter(
        ([, v]) => v != null,
      ) as Array<[string, number]>)
    : [];

  // Weight delta vs the previous check-in. Surfaced as a tiny chip with
  // up/down arrow so the patient can see week-over-week trend at a glance.
  const weightDelta =
    c.weight != null && prev?.weight != null
      ? Math.round((c.weight - prev.weight) * 10) / 10
      : null;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <Link
          href="/dashboard/patient/check-in"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tutti i check-in
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <ClipboardCheck className="text-primary-500 h-7 w-7" />
            Check-in
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm capitalize">
            {fmtDate(c.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={c.status === "REVIEWED" ? "secondary" : "outline"}
            className={cn(
              c.status === "REVIEWED" && "text-success",
            )}
          >
            {c.status === "REVIEWED" ? "Revisionato" : "In attesa"}
          </Badge>
        </div>
      </header>

      {c.professional && (
        <div className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
          <Avatar className="h-9 w-9">
            {c.professional.avatarUrl && (
              <AvatarImage src={c.professional.avatarUrl} />
            )}
            <AvatarFallback className="bg-primary/15 text-primary text-xs">
              {initials(c.professional.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
              Inviato a
            </p>
            <p className="truncate text-sm font-medium">
              {c.professional.fullName}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                · {roleLabel(c.professionalRole)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Weight + rating summary */}
      {(c.weight != null || c.rating != null) && (
        <div className="grid grid-cols-2 gap-3">
          {c.weight != null && (
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                  Peso
                </p>
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {c.weight.toFixed(1)}
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    kg
                  </span>
                </p>
                {weightDelta != null && weightDelta !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium",
                      weightDelta < 0 ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {weightDelta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {weightDelta > 0 ? "+" : ""}
                    {weightDelta.toFixed(1)} kg vs precedente
                  </span>
                )}
              </CardContent>
            </Card>
          )}
          {c.rating != null && (
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                  Settimana
                </p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-5 w-5",
                        c.rating! >= n
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Photos */}
      {visiblePhotos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Foto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-3",
                visiblePhotos.length === 1
                  ? "grid-cols-1"
                  : visiblePhotos.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3",
              )}
            >
              {visiblePhotos.map(([angle, url]) => (
                <figure key={angle} className="flex flex-col gap-1.5">
                  {/* Compressed dataURL or storage URL — both work as src. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url!}
                    alt={ANGLE_LABELS[angle]}
                    className="bg-muted aspect-[3/4] w-full rounded-md object-cover"
                  />
                  <figcaption className="text-muted-foreground text-center text-[10px] tracking-wider uppercase">
                    {ANGLE_LABELS[angle]}
                  </figcaption>
                </figure>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurements */}
      {measurementEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Misure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {measurementEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-muted-foreground text-[10px] tracking-wider uppercase">
                    {MEASUREMENT_LABELS[key] ?? key}
                  </dt>
                  <dd className="font-heading text-lg font-semibold tabular-nums">
                    {value.toFixed(1)}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      cm
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Self notes */}
      {c.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Le tue note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{c.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Professional feedback */}
      {c.professionalFeedback && (
        <Card className="border-primary-500/30 bg-primary-500/5">
          <CardHeader className="flex flex-row items-center gap-2 pb-2 space-y-0">
            <MessageSquareQuote className="text-primary-500 h-4 w-4" />
            <CardTitle className="text-sm font-semibold">
              Feedback dal tuo {roleLabel(c.professionalRole).toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {c.professionalFeedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty body — when nothing was filled in but the row exists */}
      {visiblePhotos.length === 0 &&
        measurementEntries.length === 0 &&
        !c.notes &&
        c.weight == null &&
        c.rating == null && (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Questo check-in è vuoto.
            </CardContent>
          </Card>
        )}
    </div>
  );
}
