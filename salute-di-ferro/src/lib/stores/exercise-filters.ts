import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Equipment, MuscleGroup } from "@/lib/mock-workouts";

export type ExerciseView = "grid" | "list";

type State = {
  q: string;
  muscleGroups: MuscleGroup[];
  equipments: Equipment[];
  view: ExerciseView;
  page: number;
};

type Actions = {
  setQ: (q: string) => void;
  toggleMuscle: (m: MuscleGroup) => void;
  toggleEquipment: (e: Equipment) => void;
  setMuscles: (m: MuscleGroup[]) => void;
  setEquipments: (e: Equipment[]) => void;
  setView: (v: ExerciseView) => void;
  setPage: (p: number) => void;
  reset: () => void;
};

const initial: State = {
  q: "",
  muscleGroups: [],
  equipments: [],
  view: "grid",
  page: 1,
};

export const useExerciseFilters = create<State & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setQ: (q) => set({ q, page: 1 }),
      toggleMuscle: (m) =>
        set((s) => ({
          page: 1,
          muscleGroups: s.muscleGroups.includes(m)
            ? s.muscleGroups.filter((x) => x !== m)
            : [...s.muscleGroups, m],
        })),
      toggleEquipment: (e) =>
        set((s) => ({
          page: 1,
          equipments: s.equipments.includes(e)
            ? s.equipments.filter((x) => x !== e)
            : [...s.equipments, e],
        })),
      setMuscles: (muscleGroups) => set({ muscleGroups, page: 1 }),
      setEquipments: (equipments) => set({ equipments, page: 1 }),
      setView: (view) => set({ view }),
      setPage: (page) => set({ page }),
      reset: () => set({ ...initial }),
    }),
    { name: "exercise-filters" },
  ),
);
