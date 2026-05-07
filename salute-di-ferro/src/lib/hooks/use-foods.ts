"use client";

import { useQuery } from "@tanstack/react-query";

import {
  buildOffSearchUrl,
  parseOffSearchResponse,
  type FoodSearchResult,
} from "@/lib/off";

export type { FoodSearchResult } from "@/lib/off";

export type RecentFood = {
  description: string;
  caloriesKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  freq: number;
};

/**
 * Free-text search against Open Food Facts via our server proxy.
 *
 * If the proxy returns 503 with `X-Off-Source: ratelimited`, OFF has
 * throttled our shared egress IP — we transparently fall back to a
 * direct browser → OFF fetch so each patient consumes their own
 * 10 req/min quota instead of fighting over the server's. The result
 * shape is identical because both paths run through `parseOffSearchResponse`.
 *
 * The query string should already be debounced upstream — this hook
 * does not debounce, but only fires for queries with >= 3 characters.
 */
export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["foods", "search", trimmed],
    queryFn: async () => {
      const proxyRes = await fetch(
        `/api/nutrition/foods/search?q=${encodeURIComponent(trimmed)}`,
      );

      // Server cache hit or fresh OFF call — done.
      if (proxyRes.ok) {
        return (await proxyRes.json()) as FoodSearchResult[];
      }

      // 503 + ratelimited signal: skip the proxy and call OFF straight
      // from the browser. Other failures: surface an empty list.
      const ratelimited =
        proxyRes.status === 503 &&
        proxyRes.headers.get("X-Off-Source") === "ratelimited";
      if (!ratelimited) return [] as FoodSearchResult[];

      try {
        const offRes = await fetch(buildOffSearchUrl(trimmed), {
          headers: { Accept: "application/json" },
        });
        if (!offRes.ok) return [] as FoodSearchResult[];
        const data = await offRes.json();
        return parseOffSearchResponse(data, trimmed);
      } catch {
        return [] as FoodSearchResult[];
      }
    },
    enabled: trimmed.length >= 3,
    staleTime: 60_000,
  });
}

/**
 * Top distinct diary entries from the patient's own history (last 90
 * days), ranked by frequency. Used as a "Recenti" group at the top of
 * the food picker so common foods are one click away.
 */
export function useRecentFoods() {
  return useQuery({
    queryKey: ["foods", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/nutrition/diary/recent");
      if (!res.ok) return [] as RecentFood[];
      return (await res.json()) as RecentFood[];
    },
    staleTime: 60_000,
  });
}
