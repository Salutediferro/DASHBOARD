"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string | number;
  delta?: number;
  trend?: number[];
  loading?: boolean;
  invertDelta?: boolean;
  unit?: string;
  className?: string;
};

export default function StatCard({
  label,
  value,
  delta,
  trend,
  loading = false,
  invertDelta = false,
  unit,
  className,
}: StatCardProps) {
  const gradientId = useId();

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={`Loading ${label}`}
        className={cn("surface-1 p-4", className)}
      >
        <div className="relative h-3 w-24 overflow-hidden rounded bg-muted/60 skeleton-shimmer" />
        <div className="relative mt-3 h-8 w-28 overflow-hidden rounded bg-muted/60 skeleton-shimmer" />
        <div className="relative mt-4 h-10 w-full overflow-hidden rounded bg-muted/60 skeleton-shimmer" />
      </div>
    );
  }

  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const down = hasDelta && (delta as number) < 0;
  const good = invertDelta ? down : up;
  const bad = invertDelta ? up : down;
  const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : ArrowRight;

  const data = trend?.map((v, i) => ({ i, v })) ?? [];

  return (
    <div className={cn("surface-1 p-4", className)}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-display text-3xl tabular-nums">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              good && "text-success",
              bad && "text-destructive",
              !good && !bad && "text-muted-foreground",
            )}
          >
            <Arrow className="h-3 w-3" aria-hidden />
            {(delta as number) > 0 ? "+" : ""}
            {(delta as number).toFixed(1)}%
          </span>
        )}
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3 h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b22222" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#b22222" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#b22222"
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
