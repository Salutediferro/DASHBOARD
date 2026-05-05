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
 * Build SVG linearGradient stops keyed by chart Y-position. Offset 0%
 * is the top of the chart (highest value) and 100% is the bottom
 * (lowest), so we map each band edge through (yMax - v) / (yMax - yMin)
 * before emitting a stop.
 *
 * Tolerance bands are ±5% of |target| (green) and ±15% (yellow), the
 * same shape used by the ring-progress logic so the chart and the
 * cards agree on what "close enough" means.
 */
function gradientStops(opts: {
  lo: number;
  hi: number;
  target: number;
  direction: MetricDirection;
  /** Per-stop opacity. Pass 1 for the stroke gradient and a smaller
   *  value (e.g. 0.35) for the area fill so the band is visible
   *  without drowning out the trend line. */
  opacity: number;
}): { offset: number; color: string; opacity: number }[] {
  const { lo, hi, target, direction, opacity } = opts;
  const span = hi - lo;
  if (span <= 0) {
    return [{ offset: 0, color: GRADE_GREEN, opacity }];
  }
  const offsetFor = (v: number) => clamp01((hi - v) / span);
  const tol5 = Math.abs(target) * 0.05;
  const tol15 = Math.abs(target) * 0.15;

  const raw: { offset: number; color: string }[] = [];
  if (direction === "lower") {
    // High = bad (red), at-or-below target = good (green).
    raw.push({ offset: 0, color: GRADE_RED });
    raw.push({ offset: offsetFor(target + tol15), color: GRADE_YELLOW });
    raw.push({ offset: offsetFor(target + tol5), color: GRADE_GREEN });
    raw.push({ offset: 1, color: GRADE_GREEN });
  } else if (direction === "higher") {
    // High = good, far below = bad.
    raw.push({ offset: 0, color: GRADE_GREEN });
    raw.push({ offset: offsetFor(target - tol5), color: GRADE_GREEN });
    raw.push({ offset: offsetFor(target - tol15), color: GRADE_YELLOW });
    raw.push({ offset: 1, color: GRADE_RED });
  } else {
    // bidirectional / closeness — symmetric on both sides of target.
    raw.push({ offset: 0, color: GRADE_RED });
    raw.push({ offset: offsetFor(target + tol15), color: GRADE_YELLOW });
    raw.push({ offset: offsetFor(target + tol5), color: GRADE_GREEN });
    raw.push({ offset: offsetFor(target - tol5), color: GRADE_GREEN });
    raw.push({ offset: offsetFor(target - tol15), color: GRADE_YELLOW });
    raw.push({ offset: 1, color: GRADE_RED });
  }

  // Sort + dedupe near-identical offsets (can happen when target
  // sits at the chart edge or the data range is narrower than the
  // tolerance bands).
  return raw
    .map((s) => ({ ...s, offset: clamp01(s.offset), opacity }))
    .sort((a, b) => a.offset - b.offset)
    .filter((s, i, arr) => i === 0 || s.offset - arr[i - 1].offset > 1e-4);
}

// Premium area chart body. Two flavours:
//   • brand mode (target == null): single-hue area + stroke, current
//     behaviour preserved.
//   • target mode (target != null): horizontal dashed reference line
//     at the target Y, plus a vertical red→yellow→green gradient
//     applied to both stroke and fill so the trend line itself reads
//     "closer to target" or "drifting away" at a glance.
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
        ? gradientStops({ lo, hi, target: target!, direction, opacity: 0.35 })
        : null,
    [useTargetGradient, lo, hi, target, direction],
  );
  const strokeStops = React.useMemo(
    () =>
      useTargetGradient
        ? gradientStops({ lo, hi, target: target!, direction, opacity: 1 })
        : null,
    [useTargetGradient, lo, hi, target, direction],
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
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  {fillStops.map((s, i) => (
                    <stop
                      key={`${i}-${s.offset.toFixed(4)}`}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity={s.opacity}
                    />
                  ))}
                </linearGradient>
                <linearGradient id={strokeId} x1="0" y1="0" x2="0" y2="1">
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
