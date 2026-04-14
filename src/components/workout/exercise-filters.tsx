"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useExerciseFilters } from "@/lib/stores/exercise-filters";
import {
  EQUIPMENTS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
} from "@/lib/validators/exercise";
import type { Equipment, MuscleGroup } from "@/lib/mock-workouts";
import { cn } from "@/lib/utils";

export function ExerciseFiltersPanel() {
  const {
    q,
    muscleGroups,
    equipments,
    setQ,
    toggleMuscle,
    toggleEquipment,
    reset,
  } = useExerciseFilters();

  const [localQ, setLocalQ] = React.useState(q);

  React.useEffect(() => {
    const t = setTimeout(() => setQ(localQ), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQ]);

  React.useEffect(() => {
    setLocalQ(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium">Cerca</label>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Nome esercizio..."
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Gruppo muscolare</label>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full justify-start">
                {muscleGroups.length === 0
                  ? "Tutti i gruppi"
                  : `${muscleGroups.length} selezionati`}
              </Button>
            }
          />
          <PopoverContent className="w-64 max-h-80 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {MUSCLE_GROUPS.map((m) => {
                const checked = muscleGroups.includes(m as MuscleGroup);
                return (
                  <label
                    key={m}
                    className={cn(
                      "hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                      checked && "bg-accent/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMuscle(m as MuscleGroup)}
                      className="accent-primary h-4 w-4"
                    />
                    {MUSCLE_LABELS[m]}
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        {muscleGroups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {muscleGroups.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMuscle(m)}
                className="bg-accent inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
              >
                {MUSCLE_LABELS[m]}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium">Attrezzatura</label>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full justify-start">
                {equipments.length === 0
                  ? "Tutte"
                  : `${equipments.length} selezionate`}
              </Button>
            }
          />
          <PopoverContent className="w-64 max-h-80 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {EQUIPMENTS.map((e) => {
                const checked = equipments.includes(e as Equipment);
                return (
                  <label
                    key={e}
                    className={cn(
                      "hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                      checked && "bg-accent/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEquipment(e as Equipment)}
                      className="accent-primary h-4 w-4"
                    />
                    {EQUIPMENT_LABELS[e]}
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        {equipments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {equipments.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => toggleEquipment(e)}
                className="bg-accent inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
              >
                {EQUIPMENT_LABELS[e]}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        onClick={() => {
          reset();
          setLocalQ("");
        }}
      >
        Reset filtri
      </Button>
    </div>
  );
}
