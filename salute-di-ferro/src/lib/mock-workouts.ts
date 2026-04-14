export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type WorkoutType =
  | "STRENGTH"
  | "HYPERTROPHY"
  | "POWERLIFTING"
  | "CONDITIONING"
  | "CUSTOM";
export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "ABS"
  | "FULL_BODY"
  | "CARDIO";
export type Equipment =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "BODYWEIGHT"
  | "BAND"
  | "KETTLEBELL"
  | "OTHER";

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  nameIt: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  description?: string;
  steps?: string[];
  tips?: string[];
  commonMistakes?: string[];
  variants?: string[];
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type WorkoutExerciseItem = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number;
  reps: string;
  rpe: number | null;
  tempo: string | null;
  restSeconds: number | null;
  notes: string | null;
  supersetGroup: string | null;
};

export type WorkoutDayItem = {
  id: string;
  name: string;
  notes: string | null;
  exercises: WorkoutExerciseItem[];
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  description: string | null;
  type: WorkoutType;
  difficulty: Difficulty;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  days: WorkoutDayItem[];
};

export type WorkoutTemplateSummary = Omit<WorkoutTemplate, "days"> & {
  dayCount: number;
};

const LIBRARY: ExerciseLibraryItem[] = [
  { id: "ex-1", name: "Back Squat", nameIt: "Squat con Bilanciere", muscleGroup: "QUADS", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-2", name: "Bench Press", nameIt: "Panca Piana con Bilanciere", muscleGroup: "CHEST", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-3", name: "Deadlift", nameIt: "Stacco da Terra", muscleGroup: "BACK", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-4", name: "Overhead Press", nameIt: "Military Press", muscleGroup: "SHOULDERS", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-5", name: "Barbell Row", nameIt: "Rematore con Bilanciere", muscleGroup: "BACK", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-6", name: "Pull Up", nameIt: "Trazioni alla Sbarra", muscleGroup: "BACK", equipment: "BODYWEIGHT", thumbnailUrl: null },
  { id: "ex-7", name: "Dumbbell Curl", nameIt: "Curl con Manubri", muscleGroup: "BICEPS", equipment: "DUMBBELL", thumbnailUrl: null },
  { id: "ex-8", name: "Triceps Pushdown", nameIt: "Pushdown ai Cavi", muscleGroup: "TRICEPS", equipment: "CABLE", thumbnailUrl: null },
  { id: "ex-9", name: "Leg Press", nameIt: "Pressa Orizzontale", muscleGroup: "QUADS", equipment: "MACHINE", thumbnailUrl: null },
  { id: "ex-10", name: "Plank", nameIt: "Plank", muscleGroup: "ABS", equipment: "BODYWEIGHT", thumbnailUrl: null },
  { id: "ex-11", name: "Romanian Deadlift", nameIt: "Stacco Rumeno", muscleGroup: "HAMSTRINGS", equipment: "BARBELL", thumbnailUrl: null },
  { id: "ex-12", name: "Incline Dumbbell Press", nameIt: "Panca Inclinata Manubri", muscleGroup: "CHEST", equipment: "DUMBBELL", thumbnailUrl: null },
  { id: "ex-13", name: "Lat Pulldown", nameIt: "Lat Machine", muscleGroup: "BACK", equipment: "CABLE", thumbnailUrl: null },
  { id: "ex-14", name: "Lateral Raise", nameIt: "Alzate Laterali", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", thumbnailUrl: null },
  { id: "ex-15", name: "Leg Curl", nameIt: "Leg Curl", muscleGroup: "HAMSTRINGS", equipment: "MACHINE", thumbnailUrl: null },
  { id: "ex-16", name: "Calf Raise", nameIt: "Calf Raise in Piedi", muscleGroup: "CALVES", equipment: "MACHINE", thumbnailUrl: null },
];

export function getExerciseLibrary(filters?: {
  q?: string;
  muscleGroup?: MuscleGroup | "ALL";
  equipment?: Equipment | "ALL";
}): ExerciseLibraryItem[] {
  const { q, muscleGroup = "ALL", equipment = "ALL" } = filters ?? {};
  return LIBRARY.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (muscleGroup !== "ALL" && e.muscleGroup !== muscleGroup) return false;
    if (equipment !== "ALL" && e.equipment !== equipment) return false;
    return true;
  });
}

const dayAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

let TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-1",
    name: "Upper / Lower Base",
    description: "Scheda base 2 giorni per intermedi",
    type: "HYPERTROPHY",
    difficulty: "INTERMEDIATE",
    tags: ["upper-lower", "base"],
    isPublic: false,
    createdAt: dayAgo(20),
    days: [
      {
        id: "d1",
        name: "Giorno A — Upper",
        notes: null,
        exercises: [
          {
            id: "we1",
            exerciseId: "ex-2",
            exerciseName: "Bench Press",
            orderIndex: 0,
            sets: 4,
            reps: "6-8",
            rpe: 8,
            tempo: "3-1-1-0",
            restSeconds: 120,
            notes: null,
            supersetGroup: null,
          },
          {
            id: "we2",
            exerciseId: "ex-5",
            exerciseName: "Barbell Row",
            orderIndex: 1,
            sets: 4,
            reps: "8-10",
            rpe: 8,
            tempo: null,
            restSeconds: 90,
            notes: "Focus su scapole retratte",
            supersetGroup: null,
          },
          {
            id: "we3",
            exerciseId: "ex-4",
            exerciseName: "Overhead Press",
            orderIndex: 2,
            sets: 3,
            reps: "8-10",
            rpe: 7,
            tempo: null,
            restSeconds: 90,
            notes: null,
            supersetGroup: null,
          },
        ],
      },
      {
        id: "d2",
        name: "Giorno B — Lower",
        notes: null,
        exercises: [
          {
            id: "we4",
            exerciseId: "ex-1",
            exerciseName: "Back Squat",
            orderIndex: 0,
            sets: 5,
            reps: "5",
            rpe: 8,
            tempo: "3-1-2-0",
            restSeconds: 180,
            notes: null,
            supersetGroup: null,
          },
          {
            id: "we5",
            exerciseId: "ex-11",
            exerciseName: "Romanian Deadlift",
            orderIndex: 1,
            sets: 3,
            reps: "8",
            rpe: 7,
            tempo: null,
            restSeconds: 120,
            notes: null,
            supersetGroup: null,
          },
        ],
      },
    ],
  },
  {
    id: "tpl-2",
    name: "Push Pull Legs",
    description: "Split classico 6 giorni/settimana",
    type: "HYPERTROPHY",
    difficulty: "ADVANCED",
    tags: ["ppl", "volume"],
    isPublic: true,
    createdAt: dayAgo(45),
    days: [],
  },
  {
    id: "tpl-3",
    name: "Full Body Principiante",
    description: "3 allenamenti a settimana, movimenti base",
    type: "STRENGTH",
    difficulty: "BEGINNER",
    tags: ["full-body"],
    isPublic: true,
    createdAt: dayAgo(60),
    days: [],
  },
];

export function listTemplates(filters?: {
  q?: string;
  type?: WorkoutType | "ALL";
  difficulty?: Difficulty | "ALL";
}): WorkoutTemplateSummary[] {
  const { q, type = "ALL", difficulty = "ALL" } = filters ?? {};
  return TEMPLATES.filter((t) => {
    if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "ALL" && t.type !== type) return false;
    if (difficulty !== "ALL" && t.difficulty !== difficulty) return false;
    return true;
  }).map(({ days, ...rest }) => ({ ...rest, dayCount: days.length }));
}

export function getTemplate(id: string): WorkoutTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function saveTemplate(t: WorkoutTemplate): WorkoutTemplate {
  const idx = TEMPLATES.findIndex((x) => x.id === t.id);
  if (idx >= 0) TEMPLATES[idx] = t;
  else TEMPLATES = [...TEMPLATES, t];
  return t;
}

export function createDraftTemplate(): WorkoutTemplate {
  const id = `tpl-${Date.now()}`;
  const draft: WorkoutTemplate = {
    id,
    name: "Nuova scheda",
    description: null,
    type: "HYPERTROPHY",
    difficulty: "INTERMEDIATE",
    tags: [],
    isPublic: false,
    createdAt: new Date().toISOString(),
    days: [
      {
        id: `d-${Date.now()}`,
        name: "Giorno A",
        notes: null,
        exercises: [],
      },
    ],
  };
  TEMPLATES = [...TEMPLATES, draft];
  return draft;
}

export function duplicateTemplate(id: string): WorkoutTemplate | null {
  const src = TEMPLATES.find((t) => t.id === id);
  if (!src) return null;
  const copy: WorkoutTemplate = {
    ...src,
    id: `tpl-${Date.now()}`,
    name: `${src.name} (copia)`,
    createdAt: new Date().toISOString(),
    days: src.days.map((d) => ({
      ...d,
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exercises: d.exercises.map((e) => ({
        ...e,
        id: `we-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    })),
  };
  TEMPLATES = [...TEMPLATES, copy];
  return copy;
}
