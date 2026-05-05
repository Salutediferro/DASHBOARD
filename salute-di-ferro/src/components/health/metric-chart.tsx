"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricDirection } from "@/lib/health/metric-direction";

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
  /** When set, the chart paints a horizontal dashed reference line at
   * this Y and the trend line + area shift through red → yellow →
   * green based on distance to the target. Without it, the chart
   * stays on the brand colour. */
  target?: number | null;
  /** How "good" relates to the target — drives the gradient shape.
   * Defaults to bidirectional when omitted (symmetric on both sides). */
  direction?: MetricDirection;
};

export function MetricChart({
  title,
  unit,
  data,
  emptyLabel = "Nessun dato disponibile",
  color = "#b22222",
  target,
  direction,
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
            target={target ?? null}
            direction={direction ?? "bidirectional"}
          />
        )}
      </CardContent>
    </Card>
  );
}
