export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div
          aria-label="Salute di Ferro logo"
          className="flex h-20 w-20 items-center justify-center rounded-full border border-[#c9a96e]/40 bg-[#0a0a0a]"
        >
          <span className="font-mono text-2xl font-bold text-[#c9a96e]">
            SDF
          </span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Salute di Ferro
        </h1>

        <p className="text-lg text-[#a1a1a1]">Coming Soon</p>
      </div>
    </main>
  );
}
