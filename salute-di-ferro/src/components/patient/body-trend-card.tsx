"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Defer the recharts bundle so the initial dashboard paint isn't blocked
// on ~100KB of chart code the user may never see (e.g. empty state).
const BodyTrendChart = dynamic(() => import("./body-trend-chart"), {
  ssr: false,
  loading: () => <div className="bg-muted/40 h-48 w-full animate-pulse rounded-md" />,
});

type Row = {
  date: string;
  weight?: number | null;
  bmi?: number | null;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
};

type MetricKey = "weight" | "bmi" | "bodyFatPercentage" | "waistCm";

const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
}> = [
  { key: "weight", label: "Peso", unit: "kg", color: "#c9a96e" },
  { key: "bmi", label: "BMI", unit: "", color: "#6fa8dc" },
  { key: "bodyFatPercentage", label: "% grasso", unit: "%", color: "#d97757" },
  { key: "waistCm", label: "Vita", unit: "cm", color: "#85c79c" },
];

type Props = {
  /** Rows may come from /api/biometrics or /api/check-ins — anything with a subset of the metric keys. */
  biometrics: Row[];
  checkIns?: Row[];
  emptyCta?: boolean;
};

export function BodyTrendCard({ biometrics, checkIns = [], emptyCta }: Props) {
  const [metric, setMetric] = React.useState<MetricKey>("weight");

  const availableMetrics = React.useMemo(() => {
    return METRICS.filter((m) =>
      [...biometrics, ...checkIns].some((r) => (r[m.key] ?? null) != null),
    );
  }, [biometrics, checkIns]);

  const active =
    availableMetrics.find((m) => m.key === metric) ?? availableMetrics[0];

  const series = React.useMemo(() => {
    if (!active) return [];
    const byDay = new Map<string, { date: string; value: number }>();
    for (const r of checkIns) {
      const v = r[active.key];
      if (v == null) continue;
      byDay.set(r.date.slice(0, 10), { date: r.date, value: v });
    }
    for (const r of biometrics) {
      const v = r[active.key];
      if (v == null) continue;
      byDay.set(r.date.slice(0, 10), { date: r.date, value: v });
    }
    return Array.from(byDay.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20);
  }, [active, biometrics, checkIns]);

  if (availableMetrics.length === 0) {
    if (!emptyCta) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Andamento corpo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Non hai ancora registrato misurazioni. Inizia con il peso o una
            circonferenza.
          </p>
          <Link
            href="/dashboard/patient/health"
            className="border-border hover:bg-muted inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            Vai a dati salute
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Andamento corpo</CardTitle>
        <div className="flex flex-wrap gap-1">
          {availableMetrics.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={cn(
                "border-border hover:bg-muted h-7 rounded-md border px-2 text-[11px] font-medium",
                active?.key === m.key && "bg-primary/10 border-primary/40",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {series.length < 2 || !active ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Servono almeno 2 valori di {active?.label.toLowerCase()} per
            vedere il trend.
          </p>
        ) : (
          <BodyTrendChart
            data={series}
            color={active.color}
            unit={active.unit}
            label={active.label}
          />
        )}
      </CardContent>
    </Card>
  );
}
