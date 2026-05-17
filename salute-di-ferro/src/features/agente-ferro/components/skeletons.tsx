/**
 * Skeletons · stati di caricamento per ogni sezione della pagina proattiva.
 *
 * Ogni skeleton è racchiuso in `role="status" aria-busy="true"` con un
 * `aria-label` che descrive cosa sta caricando, così uno screen-reader
 * annuncia "Caricamento mission del giorno" invece di restare muto.
 *
 * Usano lo `<Skeleton>` shadcn (variant "shimmer") — vedi
 * `src/components/ui/skeleton.tsx`.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GreetingSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Caricamento saluto personalizzato"
      className="flex flex-col gap-2"
    >
      <Skeleton className="h-7 w-2/3 max-w-sm" />
      <Skeleton className="h-4 w-1/2 max-w-xs" />
    </div>
  );
}

export function MissionSkeleton() {
  return (
    <Card
      role="status"
      aria-busy="true"
      aria-label="Caricamento mission del giorno"
      className="border-primary/20 bg-gradient-to-br from-primary/5 to-card p-8"
    >
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-3 w-32" />
      <Skeleton className="mb-2 h-7 w-full max-w-md" />
      <Skeleton className="mb-6 h-7 w-3/4 max-w-sm" />
      <Skeleton className="h-11 w-40 rounded-lg" />
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Caricamento metriche del giorno"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="size-5 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlanSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Caricamento piano azioni della settimana"
      className="space-y-3"
    >
      <Skeleton className="h-5 w-56" />
      <ul role="list" className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-6 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SystemGridSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Caricamento sistemi del corpo"
      className="space-y-3"
    >
      <Skeleton className="h-5 w-44" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-4 flex-1 max-w-xs" />
            <Skeleton className="size-5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
