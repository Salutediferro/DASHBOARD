import { MetricRing } from "../brand";
import { GRADE_TONE } from "@/lib/health/grade-with-target";
import type { MetricGrade } from "@/lib/health/metric-thresholds";
import { cn } from "@/lib/utils";
import type { PrimaryKey } from "./health-tabs";
import { glossaryFor } from "@/lib/health/metric-glossary";

export type RingMetric = {
  key: PrimaryKey;
  name: string;
  label: string;
  unit: string;
  value: number | null;
  target: number | null;
  progress: number; // 0..1
};

export function MetricRingCard({
  metric,
  grade,
}: {
  metric: RingMetric;
  grade?: MetricGrade | null;
}) {
  const pct = Math.round(metric.progress * 100);
  const hasValue = metric.value != null;
  const label = hasValue
    ? `${metric.value!.toFixed(metric.unit === "%" ? 1 : metric.unit === "cm" ? 1 : 1)}${metric.unit ? ` ${metric.unit}` : ""}`
    : "—";
  const sublabel =
    metric.target != null
      ? `→ ${metric.target}${metric.unit ? ` ${metric.unit}` : ""}`
      : "no target";

  // Plain-language definition for less-obvious labels (HRV, FC riposo,
  // SpO₂, …). Surfaced as a native `title` tooltip on the label so a
  // hover/long-press explains what the abbreviation actually means
  // without crowding the ring.
  const description = glossaryFor(metric.key)?.description;

  return (
    <div
      className={cn(
        "surface-1 flex flex-col items-center gap-2 rounded-xl p-4",
        grade && GRADE_TONE[grade],
      )}
      title={description}
    >
      <MetricRing
        value={metric.progress}
        size={110}
        strokeWidth={10}
        label={label}
        sublabel={sublabel}
        ariaLabel={`${metric.label}: ${label}${metric.target != null ? `, target ${metric.target}${metric.unit}, ${pct}% avvicinamento` : ""}${description ? ` — ${description}` : ""}`}
      />
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {metric.label}
      </p>
    </div>
  );
}
