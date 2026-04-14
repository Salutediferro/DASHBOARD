"use client";

import * as React from "react";
import { Filter, Grid2x2, List, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { ExerciseListRow } from "@/components/workout/exercise-list-row";
import { ExerciseFiltersPanel } from "@/components/workout/exercise-filters";
import { ExerciseDetailModal } from "@/components/workout/exercise-detail-modal";
import { CreateExerciseForm } from "@/components/workout/create-exercise-form";
import { useExercises } from "@/lib/hooks/use-exercises";
import { useExerciseFilters } from "@/lib/stores/exercise-filters";
import type { ExerciseLibraryItem } from "@/lib/mock-workouts";

export function ExerciseLibrary() {
  const { q, muscleGroups, equipments, view, page, setView, setPage } =
    useExerciseFilters();

  const { data, isLoading } = useExercises({
    q,
    muscleGroups,
    equipments,
    page,
    limit: 20,
  });

  const [selected, setSelected] = React.useState<ExerciseLibraryItem | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const exercises = data?.exercises ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">
      <aside className="hidden w-64 shrink-0 md:block">
        <ExerciseFiltersPanel />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="font-heading mr-auto text-xl font-semibold">
            Libreria Esercizi
          </h1>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="md:hidden">
                  <Filter className="mr-1 h-4 w-4" />
                  Filtri
                </Button>
              }
            />
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtri</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <ExerciseFiltersPanel />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setView("grid")}
            aria-label="Griglia"
          >
            <Grid2x2 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setView("list")}
            aria-label="Lista"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nuovo
          </Button>
        </div>

        {isLoading ? (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-2"
            }
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={
                  view === "grid"
                    ? "bg-muted h-48 animate-pulse rounded-lg"
                    : "bg-muted h-16 animate-pulse rounded-lg"
                }
              />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="border-border flex min-h-48 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">
              Nessun esercizio trovato
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onClick={() => setSelected(ex)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {exercises.map((ex) => (
              <ExerciseListRow
                key={ex.id}
                exercise={ex}
                onClick={() => setSelected(ex)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span>
              Pagina {page} di {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <ExerciseDetailModal
        exercise={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <CreateExerciseForm open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
