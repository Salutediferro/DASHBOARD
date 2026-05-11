"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MealSlot } from "@/lib/validators/nutrition";

export type NutritionAuthor = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  specialties: string[];
};

export type NutritionPlanMealItem = {
  name: string;
  quantity?: string | null;
  notes?: string | null;
};

export type NutritionPlanMeal = {
  slot: MealSlot;
  title: string;
  description?: string | null;
  items?: NutritionPlanMealItem[];
};

export type NutritionPlan = {
  id: string;
  patientId: string;
  authorId: string;
  title: string;
  notes: string | null;
  targetCaloriesKcal: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  meals: NutritionPlanMeal[];
  startDate: string | null;
  endDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: NutritionAuthor;
};

export type DiaryEntry = {
  id: string;
  patientId: string;
  consumedAt: string;
  mealSlot: MealSlot;
  description: string;
  caloriesKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthoredPatientRow = {
  patient: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  latestPlan: {
    id: string;
    title: string;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : "Errore");
  }
  return res.json();
}

async function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody.error === "string"
        ? errBody.error
        : Array.isArray(errBody.error)
          ? "Dati non validi"
          : "Errore",
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const planKeys = {
  active: (patientId?: string) =>
    ["nutrition", "plan", "active", patientId ?? "self"] as const,
  history: (patientId?: string) =>
    ["nutrition", "plan", "history", patientId ?? "self"] as const,
  authored: () => ["nutrition", "plan", "authored"] as const,
  byId: (id: string) => ["nutrition", "plan", id] as const,
};

const diaryKeys = {
  day: (date: string, patientId?: string) =>
    ["nutrition", "diary", patientId ?? "self", date] as const,
};

function withPatientQuery(url: string, patientId?: string) {
  return patientId ? `${url}${url.includes("?") ? "&" : "?"}patientId=${patientId}` : url;
}

export function useActivePlan(patientId?: string) {
  return useQuery({
    queryKey: planKeys.active(patientId),
    queryFn: () =>
      getJson<NutritionPlan | null>(
        withPatientQuery("/api/nutrition/plans/active", patientId),
      ),
  });
}

export function usePlanHistory(patientId?: string) {
  return useQuery({
    queryKey: planKeys.history(patientId),
    queryFn: () =>
      getJson<NutritionPlan[]>(
        withPatientQuery("/api/nutrition/plans", patientId),
      ),
  });
}

export function useAuthoredPatients() {
  return useQuery({
    queryKey: planKeys.authored(),
    queryFn: () =>
      getJson<AuthoredPatientRow[]>("/api/nutrition/plans/authored"),
  });
}

export function usePlan(id: string | null) {
  return useQuery({
    queryKey: id ? planKeys.byId(id) : ["nutrition", "plan", "none"],
    queryFn: () => getJson<NutritionPlan>(`/api/nutrition/plans/${id}`),
    enabled: id != null,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      patientId: string;
      title: string;
      notes?: string | null;
      targetCaloriesKcal?: number | null;
      targetProteinG?: number | null;
      targetCarbsG?: number | null;
      targetFatG?: number | null;
      meals?: NutritionPlanMeal[];
      startDate?: string | null;
      endDate?: string | null;
    }) => sendJson<NutritionPlan>("/api/nutrition/plans", "POST", input),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["nutrition", "plan"] });
      qc.setQueryData(planKeys.active(plan.patientId), plan);
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<NutritionPlan>) =>
      sendJson<NutritionPlan>(`/api/nutrition/plans/${id}`, "PATCH", patch),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["nutrition", "plan"] });
      qc.setQueryData(planKeys.byId(plan.id), plan);
    },
  });
}

export function useArchivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      sendJson<{ ok: true }>(`/api/nutrition/plans/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", "plan"] });
    },
  });
}

export function useDiary(date: string, patientId?: string) {
  return useQuery({
    queryKey: diaryKeys.day(date, patientId),
    queryFn: () =>
      getJson<DiaryEntry[]>(
        withPatientQuery(`/api/nutrition/diary?date=${date}`, patientId),
      ),
  });
}

export function useCreateDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<DiaryEntry, "id" | "patientId" | "createdAt" | "updatedAt">) =>
      sendJson<DiaryEntry>("/api/nutrition/diary", "POST", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.day(date) });
    },
  });
}

export function useUpdateDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<DiaryEntry>) =>
      sendJson<DiaryEntry>(`/api/nutrition/diary/${id}`, "PATCH", patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.day(date) });
    },
  });
}

export function useDeleteDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      sendJson<{ ok: true }>(`/api/nutrition/diary/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: diaryKeys.day(date) });
    },
  });
}

/**
 * Bulk-copy diary entries from one day onto another. Used by the
 * "Copia da..." flow on the patient diary — most patients eat the same
 * things most days, so re-typing yesterday's meals every morning is the
 * thing we're explicitly trying to remove.
 */
export function useCopyDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      sourceDate: string;
      targetDate: string;
      entryIds?: string[];
    }) =>
      sendJson<{ created: number }>("/api/nutrition/diary/copy", "POST", input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: diaryKeys.day(vars.targetDate) });
    },
  });
}
