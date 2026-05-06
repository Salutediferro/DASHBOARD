"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { FoodUnit, Food as DbFood } from "@prisma/client";
import { readApiError } from "@/lib/api-error";

// DTOs returned by /api/nutrition/* — Date columns serialise to ISO strings
// over JSON, so the frontend works with strings throughout.
export type FoodDTO = Omit<DbFood, "createdAt"> & { createdAt: string };

export type MealFoodDTO = {
  id: string;
  mealId: string;
  foodId: string;
  quantity: number;
  unit: FoodUnit;
  notes: string | null;
  createdAt: string;
  food: {
    id: string;
    name: string;
    category: string | null;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatsPer100g: number;
    fiberPer100g: number | null;
  };
};

export type MealDTO = {
  id: string;
  planId: string;
  name: string;
  orderIndex: number;
  time: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  createdAt: string;
  foods: MealFoodDTO[];
};

export type PlanDTO = {
  id: string;
  authorId: string;
  authorRole: "DOCTOR" | "COACH";
  patientId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; fullName: string; email: string };
  author: { id: string; fullName: string; role: string };
  meals: MealDTO[];
};

const PLANS_KEY = ["nutrition", "plans"] as const;
const planKey = (id: string) => ["nutrition", "plan", id] as const;
const ACTIVE_KEY = (patientId?: string) =>
  ["nutrition", "active", patientId ?? "self"] as const;

export function useNutritionPlans(patientId?: string) {
  return useQuery({
    queryKey: [...PLANS_KEY, patientId ?? "all"] as const,
    queryFn: async (): Promise<{ plans: PlanDTO[] }> => {
      const url = patientId
        ? `/api/nutrition/plans?patientId=${patientId}`
        : "/api/nutrition/plans";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento"));
      return res.json();
    },
  });
}

export function useNutritionPlan(id: string | null) {
  return useQuery({
    queryKey: planKey(id ?? ""),
    enabled: !!id,
    queryFn: async (): Promise<{ plan: PlanDTO }> => {
      const res = await fetch(`/api/nutrition/plans/${id}`);
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento"));
      return res.json();
    },
  });
}

export function useActiveNutritionPlan(patientId?: string) {
  return useQuery({
    queryKey: ACTIVE_KEY(patientId),
    queryFn: async (): Promise<{ plan: PlanDTO | null }> => {
      const url = patientId
        ? `/api/nutrition/active?patientId=${patientId}`
        : "/api/nutrition/active";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento"));
      return res.json();
    },
  });
}

export function useCreateNutritionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { patientId: string; name?: string }) => {
      const res = await fetch("/api/nutrition/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore creazione"));
      return res.json() as Promise<{ plan: PlanDTO }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export type UpdatePlanPayload = {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFats?: number | null;
  notes?: string | null;
  isActive?: boolean;
  meals?: {
    id?: string;
    name: string;
    orderIndex: number;
    time?: string | null;
    targetCalories?: number | null;
    targetProtein?: number | null;
    targetCarbs?: number | null;
    targetFats?: number | null;
    foods: {
      id?: string;
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      notes?: string | null;
    }[];
  }[];
};

export function useUpdateNutritionPlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePlanPayload) => {
      const res = await fetch(`/api/nutrition/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore salvataggio"));
      return res.json() as Promise<{ plan: PlanDTO }>;
    },
    onSuccess: ({ plan }) => {
      qc.setQueryData(planKey(planId), { plan });
      qc.invalidateQueries({ queryKey: PLANS_KEY });
      qc.invalidateQueries({ queryKey: ["nutrition", "active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteNutritionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/nutrition/plans/${planId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Errore eliminazione"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANS_KEY });
      qc.invalidateQueries({ queryKey: ["nutrition", "active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFoods(filters: { search?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  return useQuery({
    queryKey: ["foods", params.toString()] as const,
    queryFn: async (): Promise<{ foods: FoodDTO[] }> => {
      const res = await fetch(`/api/foods?${params}`);
      if (!res.ok) throw new Error(await readApiError(res, "Errore caricamento"));
      return res.json();
    },
  });
}
