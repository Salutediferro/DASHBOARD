"use client";

import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/mock-workouts";
import {
  EQUIPMENT_LABELS,
  MUSCLE_BADGE_CLASSES,
  MUSCLE_LABELS,
} from "@/lib/validators/exercise";

type Props = {
  exercise: ExerciseLibraryItem;
  onClick: () => void;
};

export function ExerciseListRow({ exercise, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-card hover:bg-accent/40 flex w-full items-center gap-3 rounded-lg border p-3 text-left"
    >
      <div className="bg-muted flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded">
        {exercise.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.nameIt}
            className="h-full w-full object-cover"
          />
        ) : (
          <Dumbbell className="text-muted-foreground h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{exercise.nameIt}</p>
        <p className="text-muted-foreground truncate text-xs">{exercise.name}</p>
      </div>
      <div className="hidden gap-1 sm:flex">
        <span
          className={cn(
            "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
            MUSCLE_BADGE_CLASSES[exercise.muscleGroup],
          )}
        >
          {MUSCLE_LABELS[exercise.muscleGroup]}
        </span>
        <span className="border-border text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]">
          {EQUIPMENT_LABELS[exercise.equipment]}
        </span>
      </div>
    </button>
  );
}
