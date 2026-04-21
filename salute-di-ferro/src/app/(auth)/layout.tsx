import Link from "next/link";

import Logo from "@/components/brand/logo";
import { ManageCookiesButton } from "@/components/legal/cookie-banner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* ── Hero (desktop only) ─────────────────────────────── */}
      <HeroPanel />

      {/* ── Form column ─────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-1 flex-col lg:w-1/2">
        {/* Mobile logo strip */}
        <header className="flex items-center justify-center gap-2 px-6 pt-10 pb-4 lg:hidden">
          <Logo variant="mark" size="md" src="/logo-sdf.svg" />
          <Logo variant="full" size="sm" />
        </header>

        <div className="page-in flex flex-1 flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 pb-8 text-[11px] text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/cookie-policy" className="hover:text-foreground">
            Cookie
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Termini
          </Link>
          <Link href="/subprocessors" className="hover:text-foreground">
            Sub-responsabili
          </Link>
          <ManageCookiesButton />
        </footer>
      </section>
    </div>
  );
}

// ── Hero panel ──────────────────────────────────────────────────

function HeroPanel() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-background lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-12"
    >
      {/* Radial primary-red highlight (post-pivot "gold") */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(178,34,34,0.06), transparent 70%)",
        }}
      />
      {/* Grid overlay 32px silver/3% */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(192,192,192,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(192,192,192,0.035) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Vignette bottom to focus the eye on the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-2">
        <Logo variant="mark" size="lg" src="/logo-sdf.svg" />
      </div>

      <div className="relative z-10 flex max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-display text-4xl leading-[1.08] md:text-5xl">
            Allena la tua forza,
            <br />
            cura la tua salute.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Un unico spazio per allenarti con il tuo coach e monitorare la tua
            salute con il tuo medico. Dati cifrati, tu scegli con chi
            condividerli.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Perché fidarsi">
          <TrustChip label="2.500+ clienti" />
          <TrustChip label="15 anni di esperienza" />
          <TrustChip label="Supervisione medica" />
        </ul>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <a
          href="https://salutediferro.com"
          target="_blank"
          rel="noreferrer"
          className="focus-ring text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          salutediferro.com
        </a>
        <div className="flex items-center gap-2">
          <a
            href="https://instagram.com/salutediferro"
            aria-label="Instagram"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <InstagramGlyph />
          </a>
          <a
            href="https://youtube.com/@salutediferro"
            aria-label="YouTube"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <YouTubeGlyph />
          </a>
        </div>
      </div>
    </aside>
  );
}

function TrustChip({ label }: { label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/25 bg-accent-500/5 px-3 py-1 text-[11px] font-medium text-accent-500">
      {label}
    </li>
  );
}

// Small brand-agnostic glyphs — Lucide 1.8.0 ships without explicit
// Instagram/YouTube icons, so we inline minimal SVG.
function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="0.9" fill="currentColor" />
    </svg>
  );
}

function YouTubeGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M22 8.5c0-1.4-1.1-2.5-2.5-2.5h-15C3.1 6 2 7.1 2 8.5v7c0 1.4 1.1 2.5 2.5 2.5h15c1.4 0 2.5-1.1 2.5-2.5z" />
      <path d="M10 9l6 3-6 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
