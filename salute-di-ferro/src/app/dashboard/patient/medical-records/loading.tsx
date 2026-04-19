import { Skeleton } from "@/components/ui/skeleton";

export default function MedicalRecordsLoading() {
  return (
    <div
      className="flex flex-col gap-6 pb-6 page-in"
      role="status"
      aria-busy="true"
      aria-label="Caricamento referti"
    >
      {/* PageHeader */}
      <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8 surface-glass flex flex-col gap-2 px-6 py-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-80" />
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      {/* Card grid */}
      <ul className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="surface-2 flex flex-col gap-3 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
