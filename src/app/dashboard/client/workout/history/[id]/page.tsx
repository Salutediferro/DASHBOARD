"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryDetail } from "@/lib/mock-client-workout";

export default function WorkoutHistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery<HistoryDetail>({
    queryKey: ["client-workout-history", id],
    queryFn: async () => {
      const res = await fetch(`/api/client/workout/history/${id}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/client/workout/history"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Storico
      </Link>

      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {data.dayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {new Date(data.date).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          · {data.durationMin} min · {data.totalVolumeKg} kg
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {data.exercises.map((e) => (
          <Card key={e.name}>
            <CardContent className="flex flex-col gap-3 p-4">
              <h3 className="font-semibold">{e.name}</h3>
              <table className="w-full text-sm tabular-nums">
                <thead className="text-muted-foreground text-[10px] uppercase">
                  <tr>
                    <th className="py-1 text-left">Set</th>
                    <th className="py-1 text-right">Peso</th>
                    <th className="py-1 text-right">Reps</th>
                    <th className="py-1 text-right">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {e.sets.map((s) => (
                    <tr key={s.setNumber} className="border-border border-t">
                      <td className="py-1.5">
                        {s.isWarmup ? "W" : s.setNumber}
                      </td>
                      <td className="py-1.5 text-right">{s.weight}</td>
                      <td className="py-1.5 text-right">{s.reps}</td>
                      <td className="text-muted-foreground py-1.5 text-right">
                        {s.rpe ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
        {data.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs uppercase">Note</p>
              <p className="mt-1 text-sm">{data.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
