// Route-level shell rendered instantly on navigation to /dashboard/patient/*
// while the real page resolves. The layout mirrors the final dashboard
// grouping (Oggi / Il tuo team / Il tuo peso / Scorciatoie) so there is
// no jump when content arrives.

function Bar({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-muted/60 animate-pulse rounded-md ${className}`} />
  );
}

function CardShell({
  height = "h-24",
  header = false,
}: {
  height?: string;
  header?: boolean;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
      {header && <Bar className="h-4 w-1/3" />}
      <Bar className={`${height} w-full`} />
    </div>
  );
}

function SectionLabel() {
  return <Bar className="h-3 w-24" />;
}

export default function PatientLoading() {
  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <Bar className="h-8 w-44" />
        <Bar className="h-4 w-60" />
      </div>

      {/* Completeness banner */}
      <CardShell height="h-14" />

      {/* "Oggi" */}
      <section className="flex flex-col gap-3">
        <SectionLabel />
        <div className="grid gap-4 md:grid-cols-2">
          <CardShell height="h-16" />
          <CardShell height="h-16" />
        </div>
        <CardShell height="h-16" />
      </section>

      {/* "Il tuo team" */}
      <section className="flex flex-col gap-3">
        <SectionLabel />
        <div className="grid gap-4 lg:grid-cols-2">
          <CardShell header height="h-20" />
          <CardShell header height="h-20" />
        </div>
      </section>

      {/* "Il tuo peso" (chart) */}
      <section className="flex flex-col gap-3">
        <SectionLabel />
        <CardShell header height="h-48" />
      </section>

      {/* Shortcuts */}
      <section className="flex flex-col gap-3">
        <SectionLabel />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bar key={i} className="h-16" />
          ))}
        </div>
      </section>
    </div>
  );
}
