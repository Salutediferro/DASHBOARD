import Link from "next/link";
import { ManageCookiesButton } from "@/components/legal/cookie-banner";

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
      <footer className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/cookie-policy" className="hover:text-foreground">
          Cookie
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Termini
        </Link>
        <ManageCookiesButton />
      </footer>
    </div>
  );
}
