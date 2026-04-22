import { Skeleton } from "@/components/ui/skeleton";

export default function HealthLoading() {
  return (
    <div
      className="flex flex-col gap-6 pb-6 page-in"
      role="status"
      aria-busy="true"
      aria-label="Caricamento dati salute"
    >
      {/* PageHeader */}
      <div className="page-header-glass -mx-4 -mt-4 flex flex-col gap-2 border-b border-border/60 px-6 py-4 md:-mx-8 md:-mt-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* Ring row */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-1 flex flex-col items-center gap-2 p-4">
              <Skeleton className="h-[110px] w-[110px] rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Tabs + chart + stats */}
      <section className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-8 w-64 rounded-full" />
        <ChartSkeleton />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-1 p-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-6 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="surface-1 relative h-56 w-full overflow-hidden p-4"
      role="presentation"
    >
      {/* Y axis ticks */}
      <div className="absolute inset-y-4 left-2 flex flex-col justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-1.5 w-6" variant="pulse" />
        ))}
      </div>
      {/* Chart body shimmer */}
      <div className="ml-10 h-full">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}
