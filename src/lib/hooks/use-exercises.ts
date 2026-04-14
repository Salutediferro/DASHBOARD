"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Equipment, ExerciseLibraryItem, MuscleGroup } from "@/lib/mock-workouts";
import type { CreateExerciseInput } from "@/lib/validators/exercise";

export type ExercisesListResponse = {
  exercises: ExerciseLibraryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ExerciseFilters = {
  q?: string;
  muscleGroups?: MuscleGroup[];
  equipments?: Equipment[];
  page?: number;
  limit?: number;
};

// TODO: remove dev bypass
function devHeaders(): HeadersInit {
  return process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...devHeaders() };
}

// API accepts single muscleGroup/equipment; we send the first and filter the rest client-side.
async function fetchExercises(filters: ExerciseFilters): Promise<ExercisesListResponse> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.muscleGroups && filters.muscleGroups.length > 0) {
    params.set("muscleGroup", filters.muscleGroups[0]);
  }
  if (filters.equipments && filters.equipments.length > 0) {
    params.set("equipment", filters.equipments[0]);
  }
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  const res = await fetch(`/api/exercises?${params.toString()}`, {
    headers: devHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load exercises");
  const data = (await res.json()) as ExercisesListResponse;

  const extraMuscles = (filters.muscleGroups ?? []).slice(1);
  const extraEquip = (filters.equipments ?? []).slice(1);
  if (extraMuscles.length > 0 || extraEquip.length > 0) {
    const allMuscles = filters.muscleGroups ?? [];
    const allEquip = filters.equipments ?? [];
    data.exercises = data.exercises.filter(
      (ex) =>
        (allMuscles.length === 0 || allMuscles.includes(ex.muscleGroup)) &&
        (allEquip.length === 0 || allEquip.includes(ex.equipment)),
    );
  }
  return data;
}

export function useExercises(filters: ExerciseFilters) {
  return useQuery({
    queryKey: ["exercises", filters],
    queryFn: () => fetchExercises(filters),
  });
}

export function useExercise(id: string | null | undefined) {
  return useQuery({
    queryKey: ["exercise", id],
    enabled: !!id,
    queryFn: async (): Promise<ExerciseLibraryItem> => {
      const res = await fetch(`/api/exercises/${id}`, { headers: devHeaders() });
      if (!res.ok) throw new Error("Failed to load exercise");
      return res.json();
    },
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateExerciseInput,
    ): Promise<{ success: boolean; exercise: ExerciseLibraryItem }> => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Impossibile creare l'esercizio",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateExerciseInput> & { videoUrl?: string | null; thumbnailUrl?: string | null };
    }): Promise<ExerciseLibraryItem> => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Impossibile aggiornare l'esercizio");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["exercise", vars.id] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/exercises/${id}`, {
        method: "DELETE",
        headers: devHeaders(),
      });
      if (!res.ok) throw new Error("Impossibile eliminare l'esercizio");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
