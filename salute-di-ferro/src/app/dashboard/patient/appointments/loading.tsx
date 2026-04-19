import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div
      className="flex flex-col gap-6 pb-6 page-in"
      role="status"
      aria-busy="true"
      aria-label="Caricamento appuntamenti"
    >
      <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8 surface-glass flex flex-col gap-2 px-6 py-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-3 w-80" />
      </div>

      {/* Upcoming */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="surface-2 flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <Skeleton className="h-11 w-11 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-1/3" />
              </div>
              <Skeleton className="h-8 w-12 rounded-md" />
            </li>
          ))}
        </ul>
      </section>

      {/* History */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="surface-1 flex flex-col divide-y divide-border/60 rounded-xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
