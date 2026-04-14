"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  unit?: string;
  trend: number;
  sparkline: number[];
  invertTrend?: boolean; // lower is better
};

export function MetricCard({
  label,
  value,
  unit,
  trend,
  sparkline,
  invertTrend,
}: Props) {
  const up = trend > 0.01;
  const down = trend < -0.01;
  const good = invertTrend ? down : up;
  const bad = invertTrend ? up : down;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : ArrowRight;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
          {label}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {value}
            {unit && (
              <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                {unit}
              </span>
            )}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              good && "text-green-500",
              bad && "text-red-500",
              !good && !bad && "text-muted-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}
          </span>
        </div>
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sparkline.slice(-7).map((v, i) => ({ i, v }))}
            >
              <Line
                type="monotone"
                dataKey="v"
                stroke="#c9a96e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
