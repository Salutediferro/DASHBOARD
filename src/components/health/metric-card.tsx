"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | null;
  unit?: string;
  previous?: number | null;
  /** If true, a decrease is considered "good" (e.g. weight, BP). */
  invertTrend?: boolean;
  decimals?: number;
};

export function MetricCard({
  label,
  value,
  unit,
  previous,
  invertTrend,
  decimals = 1,
}: Props) {
  const hasValue = value != null && Number.isFinite(value);
  const hasPrev =
    previous != null && Number.isFinite(previous) && previous !== 0;
  const delta = hasValue && hasPrev ? value - (previous as number) : null;
  const deltaPct =
    delta != null && hasPrev ? (delta / (previous as number)) * 100 : null;
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  const good = invertTrend ? down : up;
  const bad = invertTrend ? up : down;

  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : ArrowRight;

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {hasValue ? value.toFixed(decimals) : "—"}
          {hasValue && unit && (
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              {unit}
            </span>
          )}
        </p>
        {deltaPct != null && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              good && "text-green-500",
              bad && "text-red-500",
              !good && !bad && "text-muted-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
            <span>
              {delta != null && delta > 0 ? "+" : ""}
              {deltaPct.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
