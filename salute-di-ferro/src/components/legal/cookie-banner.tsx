"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useConsent, writeConsent } from "@/lib/legal/consent";

/**
 * Cookie banner — appears once, stays hidden after the user has made
 * any decision. Three entry points:
 *   - Accetta tutto (full opt-in)
 *   - Rifiuta non necessari (minimum)
 *   - Personalizza → apre il dialog con toggles per categoria
 *
 * The banner is rendered globally by the root layout; it auto-hides
 * based on localStorage state via `useConsent`. Exposing a
 * `<ManageCookiesButton />` in the footer lets users re-open it later.
 */
export function CookieBanner() {
  const consent = useConsent();
  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);

  // Re-open the banner on an explicit "manage cookies" click (custom event).
  const [manuallyOpen, setManuallyOpen] = React.useState(false);
  React.useEffect(() => {
    const onOpen = () => {
      setAnalytics(consent?.analytics ?? false);
      setPrefsOpen(true);
      setManuallyOpen(true);
    };
    window.addEventListener("sdf-consent-open", onOpen);
    return () => window.removeEventListener("sdf-consent-open", onOpen);
  }, [consent?.analytics]);

  // Hide the bottom banner while we don't know (SSR / hydrating) and
  // once the user has decided — unless they explicitly re-opened it.
  const showBanner = consent === null && !prefsOpen && !manuallyOpen;

  function acceptAll() {
    writeConsent({ necessary: true, analytics: true });
    setPrefsOpen(false);
    setManuallyOpen(false);
  }
  function rejectNonEssential() {
    writeConsent({ necessary: true, analytics: false });
    setPrefsOpen(false);
    setManuallyOpen(false);
  }
  function savePrefs() {
    writeConsent({ necessary: true, analytics });
    setPrefsOpen(false);
    setManuallyOpen(false);
  }

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Preferenze cookie"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:p-5"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm">
              <p className="font-medium">Rispettiamo la tua privacy</p>
              <p className="text-muted-foreground">
                Usiamo cookie tecnici per il funzionamento del servizio.
                Con il tuo consenso possiamo usare anche cookie di
                analytics aggregati. Leggi l&apos;
                <Link
                  href="/cookie-policy"
                  className="text-primary underline"
                >
                  Cookie Policy
                </Link>{" "}
                e l&apos;
                <Link href="/privacy" className="text-primary underline">
                  informativa
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAnalytics(false);
                  setPrefsOpen(true);
                }}
              >
                Personalizza
              </Button>
              <Button size="sm" variant="outline" onClick={rejectNonEssential}>
                Rifiuta
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Accetta tutto
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={prefsOpen}
        onOpenChange={(v) => {
          setPrefsOpen(v);
          if (!v) setManuallyOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preferenze cookie</DialogTitle>
            <DialogDescription>
              Puoi modificare le tue preferenze in qualsiasi momento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
              <div className="flex-1 text-sm">
                <p className="font-medium">Strettamente necessari</p>
                <p className="text-muted-foreground text-xs">
                  Indispensabili per autenticazione, sicurezza e
                  preferenze di interfaccia. Non disattivabili.
                </p>
              </div>
              <div className="text-muted-foreground text-xs font-medium">
                Sempre attivi
              </div>
            </div>

            <label className="flex items-start justify-between gap-4 rounded-md border border-border p-3 cursor-pointer">
              <div className="flex-1 text-sm">
                <p className="font-medium">Analytics anonimi</p>
                <p className="text-muted-foreground text-xs">
                  Metriche aggregate di utilizzo senza profilazione.
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                aria-label="Consenso analytics"
              />
              <Label className="sr-only">Analytics</Label>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={rejectNonEssential}>
              Rifiuta tutto
            </Button>
            <Button onClick={savePrefs}>Salva preferenze</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Drop-in link that re-opens the cookie preferences dialog. Use in
 * footers and /cookie-policy page.
 */
export function ManageCookiesButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        className ??
        "text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
      }
      onClick={() =>
        typeof window !== "undefined" &&
        window.dispatchEvent(new CustomEvent("sdf-consent-open"))
      }
    >
      Gestisci cookie
    </button>
  );
}
