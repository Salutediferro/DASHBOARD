// Neutral skeleton shared by every role dashboard while the server
// component resolves. Mirrors the final layout (header → 4 KPIs →
// next card → activity list → 4 quick-links) so there's no jump.

// Shimmer bar — keeps the same Bar API but uses the brand skeleton-shimmer
// pseudo-element instead of a bare opacity pulse.
function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-muted/60 rounded-md relative overflow-hidden skeleton-shimmer ${className}`}
      aria-hidden
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-6" role="status" aria-busy="true">
      <header className="page-header-glass -mx-4 -mt-4 flex flex-col gap-2 border-b border-border/60 px-6 py-4 md:-mx-8 md:-mt-8">
        <Bar className="h-8 w-60" />
        <Bar className="h-3 w-48" />
      </header>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-1 p-4">
            <Bar className="h-3 w-20" />
            <Bar className="mt-3 h-8 w-24" />
            <Bar className="mt-4 h-10 w-full" />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Bar className="h-5 w-32" />
        <div className="surface-2 rounded-xl p-5">
          <Bar className="h-3 w-28" />
          <Bar className="mt-2 h-6 w-2/3" />
          <Bar className="mt-1 h-3 w-1/2" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Bar className="h-5 w-40" />
        <div className="surface-1 divide-y divide-border/60 rounded-xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Bar className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Bar className="h-3 w-2/5" />
                <Bar className="h-2 w-1/3" />
              </div>
              <Bar className="h-2 w-10" />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Bar className="h-5 w-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-1 p-4">
              <Bar className="h-10 w-10 rounded-full" />
              <Bar className="mt-3 h-3 w-24" />
              <Bar className="mt-1 h-2 w-32" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
