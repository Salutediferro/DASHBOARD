import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div
          aria-label="Salute di Ferro logo"
          className="bg-card border-primary/40 flex h-20 w-20 items-center justify-center rounded-full border"
        >
          <span className="text-primary font-mono text-2xl font-bold">
            SDF
          </span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Salute di Ferro
        </h1>

        <p className="text-muted-foreground text-lg">Coming Soon</p>

        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="default" size="lg">
              Accedi
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Registrati
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
