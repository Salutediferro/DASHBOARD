"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BrandTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
  title: string;
  unit?: string;
};

export type Point = { date: string; value: number };

type Props = {
  title: string;
  unit?: string;
  color: string;
  data: Point[];
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function fmtLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Premium area chart body with brand gradient + custom tooltip.
// The gradient and tooltip use the primary (#b22222) hue; the stroke
// is solid primary-500 for clear readability.
export default function MetricChartBody({ title, unit, color, data }: Props) {
  const gradientId = React.useId();
  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`Grafico ${title} ${unit ? `in ${unit}` : ""}, ${data.length} punti`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <title>{`${title}${unit ? ` (${unit})` : ""}`}</title>
          <desc>{`Andamento ${title} su ${data.length} rilevazioni.`}</desc>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={fmt}
            tick={{ fill: "#a1a1a1", fontSize: 11 }}
            axisLine={{ stroke: "#3a3a3a" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#a1a1a1", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            width={36}
          />
          <Tooltip
            content={<BrandTooltip title={title} unit={unit} />}
            cursor={{ stroke: color, strokeDasharray: "3 3", strokeOpacity: 0.5 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#0a0a0a", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BrandTooltip({
  active,
  payload,
  label,
  title,
  unit,
}: BrandTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const value = typeof p.value === "number" ? p.value : Number(p.value);
  return (
    <div
      className="rounded-md border border-primary-500/40 bg-[#0a0a0a]/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
      role="status"
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {fmtLong(String(label))}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-semibold text-primary-500 tabular-nums">
          {Number.isFinite(value) ? value.toLocaleString("it-IT") : "—"}
        </span>
        {unit && (
          <span className="text-[11px] text-muted-foreground">{unit}</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">{title}</div>
    </div>
  );
}
