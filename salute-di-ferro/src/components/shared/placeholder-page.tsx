export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground text-lg">Coming soon</p>
    </div>
  );
}
