import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al sito
      </Link>
      <article className="legal-prose max-w-none text-sm leading-relaxed">
        {children}
      </article>
      <footer className="text-muted-foreground mt-16 flex flex-wrap gap-4 border-t border-border pt-6 text-xs">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/cookie-policy" className="hover:text-foreground">
          Cookie Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Termini
        </Link>
        <Link href="/subprocessors" className="hover:text-foreground">
          Sub-responsabili
        </Link>
      </footer>
    </div>
  );
}
