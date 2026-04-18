"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamic-import the recharts-heavy body so the card shell and its
// loading skeleton render without pulling ~100KB of chart code upfront.
const MetricChartBody = dynamic(() => import("./metric-chart-body"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted/40 h-48 w-full animate-pulse rounded-md" />
  ),
});

type Point = { date: string; value: number | null };

type Props = {
  title: string;
  unit?: string;
  data: Point[];
  emptyLabel?: string;
  color?: string;
};

export function MetricChart({
  title,
  unit,
  data,
  emptyLabel = "Nessun dato disponibile",
  color = "#c9a96e",
}: Props) {
  const points = data.filter(
    (p): p is { date: string; value: number } => p.value != null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title}
          {unit && (
            <span className="text-muted-foreground ml-1 text-xs">({unit})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {emptyLabel}
          </p>
        ) : (
          <MetricChartBody
            title={title}
            unit={unit}
            color={color}
            data={points}
          />
        )}
      </CardContent>
    </Card>
  );
}
