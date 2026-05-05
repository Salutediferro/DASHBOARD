import { MetricRing } from "../brand";
import { GRADE_TONE } from "@/lib/health/grade-with-target";
import type { MetricGrade } from "@/lib/health/metric-thresholds";
import { cn } from "@/lib/utils";
import type { PrimaryKey } from "./health-tabs";

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

  return (
    <div
      className={cn(
        "surface-1 flex flex-col items-center gap-2 rounded-xl p-4",
        grade && GRADE_TONE[grade],
      )}
    >
      <MetricRing
        value={metric.progress}
        size={110}
        strokeWidth={10}
        label={label}
        sublabel={sublabel}
        ariaLabel={`${metric.label}: ${label}${metric.target != null ? `, target ${metric.target}${metric.unit}, ${pct}% avvicinamento` : ""}`}
      />
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {metric.label}
      </p>
    </div>
  );
}
