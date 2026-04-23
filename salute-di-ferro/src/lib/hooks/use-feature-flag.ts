"use client";

import { useQuery } from "@tanstack/react-query";

type FlagsResponse = { flags: Record<string, boolean> };

async function fetchFlags(): Promise<Record<string, boolean>> {
  const res = await fetch("/api/flags", { cache: "no-store" });
  if (!res.ok) return {};
  const json = (await res.json()) as FlagsResponse;
  return json.flags ?? {};
}

/**
 * Read a single feature flag from the public `/api/flags` endpoint.
 * Values are cached for 60s via React Query + the endpoint's own 15s
 * edge cache — an admin flip propagates to the UI within ~1 min.
 *
 * Returns `{ value, isLoading }`. `value` is `undefined` while loading,
 * then the boolean value (or the declared default on the server when
 * the flag is unset). Consumers should handle the tri-state to avoid
 * flashing the "off" state before the first fetch resolves.
 *
 * Usage:
 *   const { value: canRegister } = useFeatureFlag("patient-registration-open");
 *   if (canRegister === false) return <Closed />;
 */
export function useFeatureFlag(key: string): {
  value: boolean | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFlags,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  return { value: data?.[key], isLoading };
}

/**
 * Lower-level hook — returns the full map. Use when a page reads many
 * flags so you only register one query.
 */
export function useAllFeatureFlags(): {
  flags: Record<string, boolean> | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFlags,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  return { flags: data, isLoading };
}
