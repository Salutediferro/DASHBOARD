"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyzeResponse,
  CreateLogRequest,
} from "@/lib/validators/nutrition-log";

export type NutritionLogFoodRow = {
  id: string;
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type NutritionLogRow = {
  id: string;
  photoUrl: string;
  loggedAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  notes: string | null;
  foods: NutritionLogFoodRow[];
};

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}
function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...devHeaders() };
}

export function useNutritionLogs(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["nutrition-logs", filters],
    queryFn: async (): Promise<{ logs: NutritionLogRow[] }> => {
      const params = new URLSearchParams();
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      const res = await fetch(`/api/nutrition-logs?${params}`, { headers: devHeaders() });
      if (!res.ok) throw new Error("Failed to load logs");
      return res.json();
    },
  });
}

export function useAnalyzeFoodPhoto() {
  return useMutation({
    mutationFn: async (photoUrl: string): Promise<AnalyzeResponse & { mock?: boolean }> => {
      const res = await fetch("/api/ai/analyze-food-photo", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ photoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Analisi fallita");
      }
      return res.json();
    },
  });
}

export function useCreateNutritionLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLogRequest) => {
      const res = await fetch("/api/nutrition-logs", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Impossibile salvare il pasto");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition-logs"] });
    },
  });
}
