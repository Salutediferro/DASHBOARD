import { prisma } from "@/lib/prisma";
import type { OverviewMetricKey } from "@/lib/hooks/use-overview-prefs";
import type { MetricTargetValue } from "@/lib/hooks/use-metric-targets";

/**
 * Server-side fetch of a patient's saved metric targets, shaped to
 * match the client hook's `targets` map exactly. Used to seed React
 * Query so the dashboard renders coloured cards on the very first
 * paint instead of flashing neutral and then re-rendering.
 */
export async function getMetricTargets(
  patientId: string,
): Promise<Partial<Record<OverviewMetricKey, MetricTargetValue>>> {
  const rows = await prisma.metricTarget.findMany({
    where: { patientId },
    select: { metricKey: true, value: true, secondary: true },
  });
  const out: Partial<Record<OverviewMetricKey, MetricTargetValue>> = {};
  for (const r of rows) {
    const key = r.metricKey as OverviewMetricKey;
    if (r.secondary != null) {
      // Composite — current sole case is blood pressure.
      out[key] = { systolic: r.value, diastolic: r.secondary };
    } else {
      out[key] = r.value;
    }
  }
  return out;
}
