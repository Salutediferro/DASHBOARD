export type HomeData = {
  userName: string;
  unreadNotifications: number;
  nextWorkout: { name: string; dayLabel: string; exercises: number; durationMin: number } | null;
  nutrition: { kcalConsumed: number; kcalTarget: number; proteinG: number; proteinTargetG: number };
  metrics: { weightKg: number; bodyFatPct: number; steps: number; sleepHours: number };
};

export const mockHome: HomeData = {
  userName: "Simone",
  unreadNotifications: 3,
  nextWorkout: { name: "Push Day A", dayLabel: "Oggi · Petto / Spalle / Tricipiti", exercises: 6, durationMin: 55 },
  nutrition: { kcalConsumed: 1420, kcalTarget: 2400, proteinG: 98, proteinTargetG: 180 },
  metrics: { weightKg: 82.4, bodyFatPct: 16.2, steps: 6820, sleepHours: 7.2 },
};

export function useHomeData() {
  return { data: mockHome, isLoading: false, refetch: async () => mockHome };
}
