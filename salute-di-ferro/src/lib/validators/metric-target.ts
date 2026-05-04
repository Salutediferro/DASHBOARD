import { z } from "zod";
import { OVERVIEW_METRIC_KEYS } from "@/lib/overview-metric-keys";

// Constrain the metric vocabulary at the API boundary so a typo on the
// client doesn't quietly create a stray row that no card ever reads.
const metricKeySchema = z.enum(
  OVERVIEW_METRIC_KEYS as readonly [string, ...string[]],
);

// Wide bands — finer per-metric ranges live in the form validators.
// Here we just guard against absurd inputs that could only happen
// through a hand-crafted request.
export const metricTargetUpsertSchema = z
  .object({
    metricKey: metricKeySchema,
    value: z.number().finite().min(-1_000_000).max(1_000_000),
    secondary: z.number().finite().min(-1_000_000).max(1_000_000).nullable().optional(),
  })
  .refine(
    (d) => (d.metricKey === "bloodPressure" ? d.secondary != null : true),
    { message: "bloodPressure target requires `secondary` (diastolic)", path: ["secondary"] },
  );

export type MetricTargetUpsertInput = z.infer<typeof metricTargetUpsertSchema>;
