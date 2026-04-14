"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { WorkoutEditor } from "@/components/workout/workout-editor";
import type { WorkoutTemplate } from "@/lib/mock-workouts";

export default function WorkoutEditPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery<WorkoutTemplate>({
    queryKey: ["workout", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">Scheda non trovata</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/coach/workouts"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutte le schede
      </Link>
      <WorkoutEditor template={data} />
    </div>
  );
}
