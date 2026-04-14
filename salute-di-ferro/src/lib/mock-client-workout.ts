export type PlannedSet = {
  setNumber: number;
  previousWeight: number | null;
  previousReps: number | null;
  isWarmup: boolean;
};

export type PlannedExercise = {
  id: string;
  name: string;
  notes: string | null;
  videoUrl: string | null;
  restSeconds: number;
  supersetGroup: string | null;
  plannedSets: number;
  plannedReps: string;
  sets: PlannedSet[];
};

export type TodayWorkout = {
  sessionId: string;
  templateName: string;
  dayName: string;
  exercises: PlannedExercise[];
};

export type HistoryItem = {
  id: string;
  date: string;
  templateName: string;
  dayName: string;
  durationMin: number;
  totalVolumeKg: number;
  rating: number | null;
};

export type HistoryDetail = HistoryItem & {
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
      isWarmup: boolean;
    }[];
  }[];
  notes: string | null;
};

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

export function getTodayWorkoutMock(): TodayWorkout {
  return {
    sessionId: `sess-${Date.now()}`,
    templateName: "Upper / Lower Base",
    dayName: "Giorno A — Upper",
    exercises: [
      {
        id: "we1",
        name: "Bench Press",
        notes: "Mantieni scapole retratte, bilanciere al petto",
        videoUrl: null,
        restSeconds: 120,
        supersetGroup: null,
        plannedSets: 4,
        plannedReps: "6-8",
        sets: [
          { setNumber: 1, previousWeight: 40, previousReps: 10, isWarmup: true },
          { setNumber: 2, previousWeight: 80, previousReps: 8, isWarmup: false },
          { setNumber: 3, previousWeight: 85, previousReps: 7, isWarmup: false },
          { setNumber: 4, previousWeight: 85, previousReps: 6, isWarmup: false },
        ],
      },
      {
        id: "we2",
        name: "Barbell Row",
        notes: "Torso a 45°, focus sul tirare con la schiena",
        videoUrl: null,
        restSeconds: 90,
        supersetGroup: "sg-1",
        plannedSets: 4,
        plannedReps: "8-10",
        sets: [
          { setNumber: 1, previousWeight: 60, previousReps: 10, isWarmup: false },
          { setNumber: 2, previousWeight: 65, previousReps: 9, isWarmup: false },
          { setNumber: 3, previousWeight: 65, previousReps: 8, isWarmup: false },
          { setNumber: 4, previousWeight: 65, previousReps: 8, isWarmup: false },
        ],
      },
      {
        id: "we3",
        name: "Dumbbell Curl",
        notes: null,
        videoUrl: null,
        restSeconds: 60,
        supersetGroup: "sg-1",
        plannedSets: 3,
        plannedReps: "12",
        sets: [
          { setNumber: 1, previousWeight: 14, previousReps: 12, isWarmup: false },
          { setNumber: 2, previousWeight: 14, previousReps: 11, isWarmup: false },
          { setNumber: 3, previousWeight: 14, previousReps: 10, isWarmup: false },
        ],
      },
      {
        id: "we4",
        name: "Triceps Pushdown",
        notes: null,
        videoUrl: null,
        restSeconds: 60,
        supersetGroup: null,
        plannedSets: 3,
        plannedReps: "12-15",
        sets: [
          { setNumber: 1, previousWeight: 30, previousReps: 15, isWarmup: false },
          { setNumber: 2, previousWeight: 32, previousReps: 13, isWarmup: false },
          { setNumber: 3, previousWeight: 32, previousReps: 12, isWarmup: false },
        ],
      },
    ],
  };
}

export function getHistoryMock(): HistoryItem[] {
  return [
    {
      id: "wl1",
      date: dayAgo(2),
      templateName: "Upper / Lower Base",
      dayName: "Giorno B — Lower",
      durationMin: 62,
      totalVolumeKg: 4850,
      rating: 4,
    },
    {
      id: "wl2",
      date: dayAgo(4),
      templateName: "Upper / Lower Base",
      dayName: "Giorno A — Upper",
      durationMin: 58,
      totalVolumeKg: 3920,
      rating: 5,
    },
    {
      id: "wl3",
      date: dayAgo(7),
      templateName: "Upper / Lower Base",
      dayName: "Giorno B — Lower",
      durationMin: 55,
      totalVolumeKg: 4700,
      rating: 3,
    },
  ];
}

export function getHistoryDetailMock(id: string): HistoryDetail | null {
  const base = getHistoryMock().find((h) => h.id === id);
  if (!base) return null;
  return {
    ...base,
    notes: "Sessione solida, buona energia",
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { setNumber: 1, weight: 40, reps: 10, rpe: 6, isWarmup: true },
          { setNumber: 2, weight: 80, reps: 8, rpe: 7, isWarmup: false },
          { setNumber: 3, weight: 85, reps: 7, rpe: 8, isWarmup: false },
          { setNumber: 4, weight: 85, reps: 6, rpe: 9, isWarmup: false },
        ],
      },
      {
        name: "Barbell Row",
        sets: [
          { setNumber: 1, weight: 65, reps: 10, rpe: 7, isWarmup: false },
          { setNumber: 2, weight: 65, reps: 9, rpe: 7.5, isWarmup: false },
          { setNumber: 3, weight: 65, reps: 8, rpe: 8, isWarmup: false },
        ],
      },
    ],
  };
}
