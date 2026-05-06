"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricDirection } from "@/lib/health/metric-direction";

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
  /** Horizontal target reference. When non-null the chart paints a
   * dashed gray line here and switches to a target-aware colour
   * gradient (red → yellow → green) instead of the brand fill. */
  target: number | null;
  /** Direction the metric "wants" to move relative to the target.
   * Drives the gradient shape (bilateral red bands for `bidirectional`/
   * `closeness`, single-sided for `lower`/`higher`). */
  direction: MetricDirection;
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

const GRADE_GREEN = "#10b981"; // emerald-500
const GRADE_YELLOW = "#f59e0b"; // amber-500
const GRADE_RED = "#ef4444"; // red-500

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Grade a single value against the target/direction. Tolerance bands
 * are ±5% of |target| (green) and ±15% (yellow) — same shape used by
 * the ring-progress logic so the chart, cards, and rings agree on
 * what "close enough" means.
 */
function gradeColor(
  value: number,
  target: number,
  direction: MetricDirection,
): string {
  const tol5 = Math.abs(target) * 0.05;
  const tol15 = Math.abs(target) * 0.15;
  const diff = value - target;
  const absDiff = Math.abs(diff);
  if (direction === "lower") {
    if (diff <= tol5) return GRADE_GREEN;
    if (diff <= tol15) return GRADE_YELLOW;
    return GRADE_RED;
  }
  if (direction === "higher") {
    if (-diff <= tol5) return GRADE_GREEN;
    if (-diff <= tol15) return GRADE_YELLOW;
    return GRADE_RED;
  }
  // bidirectional / closeness — symmetric around the target.
  if (absDiff <= tol5) return GRADE_GREEN;
  if (absDiff <= tol15) return GRADE_YELLOW;
  return GRADE_RED;
}

/**
 * Build SVG linearGradient stops keyed by chart X-position. Each point
 * owns the half-segment to either neighbour; sharp colour transitions
 * land at midpoints where the grade changes (two stops at the same
 * offset → no blending). Result: every period reads as a solid red /
 * yellow / green vertical band whose colour matches that point's
 * proximity to target.
 */
function gradientStops(opts: {
  data: Point[];
  target: number;
  direction: MetricDirection;
  /** Per-stop opacity. Pass 1 for the stroke gradient and a smaller
   *  value (e.g. 0.35) for the area fill so the band is visible
   *  without drowning out the trend line. */
  opacity: number;
}): { offset: number; color: string; opacity: number }[] {
  const { data, target, direction, opacity } = opts;
  const n = data.length;
  if (n === 0) return [{ offset: 0, color: GRADE_GREEN, opacity }];

  const colors = data.map((d) => gradeColor(d.value, target, direction));
  if (n === 1) {
    return [
      { offset: 0, color: colors[0], opacity },
      { offset: 1, color: colors[0], opacity },
    ];
  }

  const stops: { offset: number; color: string; opacity: number }[] = [];
  stops.push({ offset: 0, color: colors[0], opacity });
  for (let i = 0; i < n - 1; i++) {
    if (colors[i] !== colors[i + 1]) {
      const mid = clamp01((i + 0.5) / (n - 1));
      stops.push({ offset: mid, color: colors[i], opacity });
      stops.push({ offset: mid, color: colors[i + 1], opacity });
    }
  }
  stops.push({ offset: 1, color: colors[n - 1], opacity });
  return stops;
}

// Premium area chart body. Two flavours:
//   • brand mode (target == null): single-hue area + stroke, current
//     behaviour preserved.
//   • target mode (target != null): horizontal dashed reference line
//     at the target Y, plus a horizontal (per-period) red/yellow/green
//     gradient applied to both stroke and fill so each segment reads
//     "in range" or "out of range" at the time it was recorded.
export default function MetricChartBody({
  title,
  unit,
  color,
  data,
  target,
  direction,
}: Props) {
  const fillId = React.useId();
  const strokeId = React.useId();

  // Compute Y range manually so the target reference line is always
  // in view — even if the user is far above/below the recorded data.
  const { domain, lo, hi } = React.useMemo(() => {
    const values = data.map((d) => d.value).filter((v) => Number.isFinite(v));
    let dataMin = values.length ? Math.min(...values) : 0;
    let dataMax = values.length ? Math.max(...values) : 1;
    if (target != null && Number.isFinite(target)) {
      dataMin = Math.min(dataMin, target);
      dataMax = Math.max(dataMax, target);
    }
    // Extend by ~5% (or 1, whichever is bigger) for breathing room.
    const pad = Math.max(1, (dataMax - dataMin) * 0.05);
    const loV = dataMin - pad;
    const hiV = dataMax + pad;
    return {
      lo: loV,
      hi: hiV,
      domain: [loV, hiV] as [number, number],
    };
  }, [data, target]);

  const useTargetGradient =
    target != null && Number.isFinite(target) && hi > lo;

  const fillStops = React.useMemo(
    () =>
      useTargetGradient
        ? gradientStops({ data, target: target!, direction, opacity: 0.35 })
        : null,
    [useTargetGradient, data, target, direction],
  );
  const strokeStops = React.useMemo(
    () =>
      useTargetGradient
        ? gradientStops({ data, target: target!, direction, opacity: 1 })
        : null,
    [useTargetGradient, data, target, direction],
  );

  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`Grafico ${title} ${unit ? `in ${unit}` : ""}, ${data.length} punti${
        target != null ? `, target ${target}${unit ? ` ${unit}` : ""}` : ""
      }`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <title>{`${title}${unit ? ` (${unit})` : ""}`}</title>
          <desc>
            {`Andamento ${title} su ${data.length} rilevazioni${
              target != null ? `, target ${target}` : ""
            }.`}
          </desc>
          <defs>
            {useTargetGradient && fillStops && strokeStops ? (
              <>
                <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
                  {fillStops.map((s, i) => (
                    <stop
                      key={`${i}-${s.offset.toFixed(4)}`}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity={s.opacity}
                    />
                  ))}
                </linearGradient>
                <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                  {strokeStops.map((s, i) => (
                    <stop
                      key={`${i}-${s.offset.toFixed(4)}`}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity={s.opacity}
                    />
                  ))}
                </linearGradient>
              </>
            ) : (
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
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
            domain={domain}
            width={36}
          />
          <Tooltip
            content={<BrandTooltip title={title} unit={unit} />}
            cursor={{
              stroke: useTargetGradient ? "#9ca3af" : color,
              strokeDasharray: "3 3",
              strokeOpacity: 0.5,
            }}
          />
          {useTargetGradient && target != null && (
            <ReferenceLine
              y={target}
              stroke="#9ca3af"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: `obiettivo ${target}${unit ? ` ${unit}` : ""}`,
                position: "right",
                fill: "#9ca3af",
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={useTargetGradient ? `url(#${strokeId})` : color}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: useTargetGradient ? "#ffffff" : color,
              stroke: useTargetGradient ? "#0a0a0a" : "#0a0a0a",
              strokeWidth: 2,
            }}
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
