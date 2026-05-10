"use client";

import { useQuery } from "@tanstack/react-query";

import type { FoodSearchResult } from "@/lib/food-search";

export type { FoodSearchResult } from "@/lib/food-search";

export type RecentFood = {
  description: string;
  caloriesKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  freq: number;
};

/**
 * Free-text search against our local `Food` table via the API route.
 *
 * The query string should already be debounced upstream — this hook
 * does not debounce, but only fires for queries with >= 3 characters.
 */
export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["foods", "search", trimmed],
    queryFn: async () => {
      const res = await fetch(
        `/api/nutrition/foods/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (!res.ok) return [] as FoodSearchResult[];
      return (await res.json()) as FoodSearchResult[];
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
