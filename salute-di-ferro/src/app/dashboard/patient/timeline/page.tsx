"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageSquareQuote,
  NotebookPen,
  Pill,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PrimaryKey } from "@/components/health/health-tabs";
import { getMapping, METRICS, type MetricConfig } from "@/components/health/health-ring-row";

type TimelineEvent = {
  id: string;
  kind: "CHECK_IN" | "BIOMETRIC" | "APPOINTMENT" | "REPORT" | "FEEDBACK" | "MEDICATION" | "SYMPTOM";
  date: string;
  title: string;
  description: string | null;
  href: string | null;
  meta: Record<string, unknown> | null;
};

const KIND_META: Record<
  TimelineEvent["kind"],
  { label: string; icon: React.ReactNode; tone: string }
> = {
  CHECK_IN: {
    label: "Check-in",
    icon: <ClipboardCheck className="h-4 w-4" />,
    tone: "bg-primary/10 text-primary",
  },
  BIOMETRIC: {
    label: "Biometria",
    icon: <Activity className="h-4 w-4" />,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  APPOINTMENT: {
    label: "Appuntamento",
    icon: <Calendar className="h-4 w-4" />,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  REPORT: {
    label: "Referto",
    icon: <FileText className="h-4 w-4" />,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  FEEDBACK: {
    label: "Feedback",
    icon: <MessageSquareQuote className="h-4 w-4" />,
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  MEDICATION: {
    label: "Supplementi",
    icon: <Pill className="h-4 w-4" />,
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  SYMPTOM: {
    label: "Diario",
    icon: <NotebookPen className="h-4 w-4" />,
    tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
};

const FILTER_OPTIONS: Array<
  { v: "ALL"; label: string } | { v: TimelineEvent["kind"]; label: string }
> = [
  { v: "ALL", label: "Tutto" },
  { v: "CHECK_IN", label: "Check-in" },
  { v: "BIOMETRIC", label: "Biometria" },
  { v: "APPOINTMENT", label: "Appuntamenti" },
  { v: "REPORT", label: "Referti" },
  { v: "FEEDBACK", label: "Feedback" },
  { v: "MEDICATION", label: "Supplementi" },
  { v: "SYMPTOM", label: "Diario" },
];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBiometricInputs(event: TimelineEvent) {
  if (!event.description) return "Misurazione vuota";

  const data = JSON.parse(event.description) as Record<PrimaryKey, number>;
  if (Object.entries(data).length === 0) return "Misurazione avanzata";

  const modified = Object.entries(data)
    .map(
      ([key, value]) =>
        [value, getMapping(key as PrimaryKey)] as [number, MetricConfig | undefined],
    )
    .filter((e) => typeof e[1] !== "undefined");

  return modified.map(([value, mapping], index) => (
    <React.Fragment key={index}>
      <span>
        {mapping?.label}: {value.toFixed(2)}
        {mapping?.unit && ` ${mapping.unit}`}
      </span>

      {index !== modified.length - 1 && <span>{" • "}</span>}
    </React.Fragment>
  ));
}

export default function PatientTimelinePage() {
  const [filter, setFilter] = React.useState<"ALL" | TimelineEvent["kind"]>("ALL");

  const { data, isLoading } = useQuery<{ events: TimelineEvent[] }>({
    queryKey: ["patient-timeline"],
    queryFn: async () => {
      const res = await fetch("/api/me/timeline");
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const events = data?.events ?? [];
  const filtered = filter === "ALL" ? events : events.filter((e) => e.kind === filter);

  const grouped = React.useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of filtered) {
      const k = dayKey(e.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">La tua timeline</h1>
        <p className="text-muted-foreground text-sm">
          Check-in, misurazioni, appuntamenti, referti e feedback in un unico flusso.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setFilter(o.v)}
            className={cn(
              "border-border hover:bg-muted h-8 rounded-md border px-3 text-xs font-medium",
              filter === o.v && "bg-primary/10 border-primary/40",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Nessun evento in questa categoria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {fmtDay(day)}
              </p>
              <ul className="border-border relative flex flex-col gap-3 border-l-2 pl-4">
                {items.map((e) => {
                  const meta = KIND_META[e.kind];
                  const body = (
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "ring-background -ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4",
                          meta.tone,
                        )}
                      >
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{e.title}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {meta.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">{fmtTime(e.date)}</span>
                        </div>

                        <p
                          className="text-muted-foreground mt-0.5 max-w-xl text-xs whitespace-pre-wrap data-[hidden='true']:hidden"
                          data-hidden={e.kind !== "BIOMETRIC" && !e.description}
                        >
                          {e.kind === "BIOMETRIC" ? getBiometricInputs(e) : e.description}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={e.id}>
                      {e.href ? (
                        <Link
                          href={e.href}
                          className="hover:bg-muted/40 -mx-2 block rounded-md px-2 py-1"
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
