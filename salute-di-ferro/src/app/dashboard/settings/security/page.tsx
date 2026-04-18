import { Suspense } from "react";
import { SecuritySettings } from "./security-settings";
import { TwoFactorRequiredBanner } from "./two-factor-required-banner";

export const metadata = { title: "Sicurezza — Salute di Ferro" };

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Sicurezza
        </h1>
        <p className="text-muted-foreground text-sm">
          Gestisci l&apos;autenticazione a due fattori (2FA).
        </p>
      </header>
      {/* Suspense required by Next's static-prerender pass — the banner
          reads the ?reason query string via useSearchParams(). */}
      <Suspense fallback={null}>
        <TwoFactorRequiredBanner />
      </Suspense>
      <SecuritySettings />
    </div>
  );
}
