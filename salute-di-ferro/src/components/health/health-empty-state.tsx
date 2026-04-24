import type { ReactNode } from "react";
import { BiometricsEmptyState } from "@/components/empty-states";

/**
 * Empty state shown when a patient has zero biometric logs.
 *
 * Historically this had its own inline SVG + frame; now it's just a
 * thin alias over `BiometricsEmptyState` so every empty state across
 * the app shares one visual family (same chrome→red ring, same brand
 * radial accent, same border). Keeping the wrapper so existing
 * imports from `components/health/health-empty-state` stay valid.
 */
export default function HealthEmptyState({ action }: { action?: ReactNode }) {
  return <BiometricsEmptyState action={action} />;
}
