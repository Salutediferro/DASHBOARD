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

export function ExerciseCard({ exercise, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-border bg-card hover:bg-accent/40 flex flex-col overflow-hidden rounded-lg border text-left transition"
    >
      <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden">
        {exercise.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.nameIt}
            className="h-full w-full object-cover"
          />
        ) : (
          <Dumbbell className="text-muted-foreground h-10 w-10" />
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium">{exercise.nameIt}</p>
        <div className="flex flex-wrap gap-1">
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
      </div>
    </button>
  );
}
