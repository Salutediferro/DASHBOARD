"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock, Dumbbell, History, Play, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TodayWorkout } from "@/lib/mock-client-workout";

export default function ClientWorkoutHome() {
  const { data, isLoading } = useQuery<TodayWorkout>({
    queryKey: ["client-workout-today"],
    queryFn: async () => {
      const res = await fetch("/api/client/workout/today");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const totalSets =
    data?.exercises.reduce((acc, e) => acc + e.plannedSets, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Allenamento
        </h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="h-48 animate-pulse p-6" />
        </Card>
      ) : data ? (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="flex flex-col gap-5 p-6">
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                Allenamento di oggi
              </p>
              <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight">
                {data.dayName}
              </h2>
              <p className="text-muted-foreground text-sm">
                {data.templateName}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border-border rounded-md border p-3">
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Dumbbell className="h-3.5 w-3.5" />
                  Esercizi
                </div>
                <p className="font-heading mt-1 text-2xl font-semibold">
                  {data.exercises.length}
                </p>
              </div>
              <div className="border-border rounded-md border p-3">
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Set totali
                </div>
                <p className="font-heading mt-1 text-2xl font-semibold">
                  {totalSets}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/client/workout/session"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-14 items-center justify-center gap-2 rounded-lg text-lg font-semibold"
            >
              <Play className="h-6 w-6 fill-current" />
              INIZIA ALLENAMENTO
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Sparkles className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground">Nessuna scheda assegnata</p>
            <Link
              href="/dashboard/client/workout/session?free=1"
              className="bg-primary text-primary-foreground inline-flex h-14 items-center gap-2 rounded-lg px-6 text-lg font-semibold"
            >
              <Play className="h-6 w-6 fill-current" />
              Allenamento libero
            </Link>
          </CardContent>
        </Card>
      )}

      <Link
        href="/dashboard/client/workout/history"
        className="border-border hover:bg-muted flex items-center gap-3 rounded-md border p-4"
      >
        <History className="text-muted-foreground h-5 w-5" />
        <div className="flex-1">
          <p className="font-medium">Storico allenamenti</p>
          <p className="text-muted-foreground text-xs">
            Rivedi le sessioni passate
          </p>
        </div>
      </Link>
    </div>
  );
}
