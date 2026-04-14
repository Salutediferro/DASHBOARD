"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryItem } from "@/lib/mock-client-workout";

export default function WorkoutHistoryPage() {
  const { data = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["client-workout-history"],
    queryFn: async () => {
      const res = await fetch("/api/client/workout/history");
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Storico
        </h1>
        <p className="text-muted-foreground text-sm">
          Le tue sessioni passate
        </p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">Nessuna sessione ancora.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((h) => (
            <Link key={h.id} href={`/dashboard/client/workout/history/${h.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-md">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {h.dayName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {new Date(h.date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {h.templateName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" /> {h.durationMin} min
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {h.totalVolumeKg} kg
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
