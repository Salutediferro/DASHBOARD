/**
 * Client-safe UI helpers for briefing actions.
 * Kept separate from briefing.ts (which is server-only + drags Prisma) so
 * Client Components can import without pulling the server graph.
 */

import type { BriefingSummary } from "@/lib/data/types";

export type ActionTone = "attention" | "informational" | "silent";

export function urgencyTone(urgency: number): ActionTone {
  if (urgency >= 80) return "attention";
  if (urgency >= 40) return "informational";
  return "silent";
}

export function actionHref(
  kind: BriefingSummary["topActions"][number]["kind"],
  itemId?: string,
): string {
  switch (kind) {
    case "therapy":
      return itemId
        ? `/dashboard/patient/supplementi#${itemId}`
        : "/dashboard/patient/supplementi";
    case "checkin":
      return "/dashboard/patient/check-in";
    case "appointment":
      return "/dashboard/patient/appointments";
    case "panel":
      return "/dashboard/patient/medical-records";
    case "marker":
      return "/dashboard/patient/health";
    case "profile":
      return "/dashboard/patient/profile";
    case "routine":
    default:
      return "/dashboard/patient";
  }
}
