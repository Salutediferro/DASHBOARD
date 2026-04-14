export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="bg-card border-primary/40 flex h-16 w-16 items-center justify-center rounded-full border">
          <span className="text-primary font-mono text-xl font-bold">SDF</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Salute di Ferro
        </h1>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
