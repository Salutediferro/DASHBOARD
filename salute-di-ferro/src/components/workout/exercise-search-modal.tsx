"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Equipment,
  ExerciseLibraryItem,
  MuscleGroup,
} from "@/lib/mock-workouts";

const MUSCLE_OPTIONS: (MuscleGroup | "ALL")[] = [
  "ALL",
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "ABS",
  "FULL_BODY",
  "CARDIO",
];

const EQUIPMENT_OPTIONS: (Equipment | "ALL")[] = [
  "ALL",
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "BAND",
  "KETTLEBELL",
  "OTHER",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ex: ExerciseLibraryItem) => void;
};

export function ExerciseSearchModal({ open, onOpenChange, onAdd }: Props) {
  const [q, setQ] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<MuscleGroup | "ALL">("ALL");
  const [equipment, setEquipment] = React.useState<Equipment | "ALL">("ALL");

  const params = new URLSearchParams({ q, muscleGroup, equipment });
  // TODO: remove dev bypass
  const devHeaders: HeadersInit =
    process.env.NODE_ENV === "development" ? { "x-dev-bypass": "1" } : {};
  const { data, isLoading } = useQuery<{
    exercises: ExerciseLibraryItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["exercise-library", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/exercises?${params}`, { headers: devHeaders });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: open,
  });
  const items = data?.exercises ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aggiungi esercizio</DialogTitle>
          <DialogDescription>
            Cerca nella libreria e aggiungi al giorno corrente
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Nome esercizio..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={muscleGroup}
            onValueChange={(v) => setMuscleGroup(v as MuscleGroup | "ALL")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === "ALL" ? "Tutti i gruppi" : m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={equipment}
            onValueChange={(v) => setEquipment(v as Equipment | "ALL")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_OPTIONS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e === "ALL" ? "Tutti" : e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Caricamento...
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nessun esercizio trovato
            </p>
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {items.map((ex) => (
                <li key={ex.id} className="flex items-center gap-3 py-2.5">
                  <div className="bg-muted flex h-10 w-14 items-center justify-center rounded">
                    <span className="text-muted-foreground text-[10px]">
                      video
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ex.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {ex.muscleGroup} · {ex.equipment}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(ex);
                      onOpenChange(false);
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 text-xs font-medium"
                  >
                    Aggiungi
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
